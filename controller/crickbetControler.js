const Bet2 = require('../models/crickbetModel');
const User_Wallet = require('../models/Wallet'); 
const User = require('../models/UserSignUp');  
const mongoose = require('mongoose');


exports.placeBet = async (req, res) => {
  try {
    const { label, odds, stake, profit, userId, type, run, match } = req.body;
    
    // Validate input
    if (!label || !odds || !userId ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input: all bet details are required and stake must be greater than 0',
      });
    }
    
    const userWallet = await User_Wallet.findOne({ user: userId });
    if (!userWallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    
    // For zero stake bets (used in bet cancellation/reduction logic), just record the bet
    if (parseFloat(stake) === 0 && parseFloat(profit) === 0) {
      const newBet = new Bet2({
        user: userId, 
        label,
        odds,
        run,
        stake,
        profit,
        liability: 0,
        type,
        match,
      });
      
      const savedBet = await newBet.save();
      
      return res.status(201).json({
        success: true,
        message: 'Bet recorded successfully',
        bet: savedBet,
        updatedWallet: userWallet.balance,
      });
    }
    
    // Check for opposite bets (YES/NO) with the same run value
    if (type === "YES" || type === "NO") {
      const oppositeType = type === "YES" ? "NO" : "YES";
      const oppositeBets = await Bet2.find({
        user: userId,
        label,
        type: oppositeType,
        run,
        status: "Pending",
        match
      });
      
      if (oppositeBets.length > 0) {
        // Calculate total stake and profit from opposite bets
        let totalOppositeStake = 0;
        let totalOppositeProfit = 0;
        
        oppositeBets.forEach(bet => {
          totalOppositeStake += parseFloat(bet.stake);
          totalOppositeProfit += parseFloat(bet.profit);
        });
        
        // For YES bets, compare stake with total NO profit
        // For NO bets, compare stake with total YES stake
        const compareValue = type === "YES" ? totalOppositeProfit : totalOppositeStake;
        
        // Case 1: Stakes are equal - cancel all opposite bets
        if (Math.abs(parseFloat(stake) - compareValue) < 0.01) {
          // Cancel all opposite bets and return their stakes to wallet
          for (const bet of oppositeBets) {
            // Return the stake to the wallet - this is the amount that was originally deducted
            const returnAmount = parseFloat(bet.stake);
            userWallet.balance += returnAmount;
            
            console.log(`Canceling bet ${bet._id}. Returning ${returnAmount} to wallet. New balance: ${userWallet.balance}`);
            
            // Update bet status
            bet.status = "Cancelled";
            await bet.save();
          }
          
          await userWallet.save();
          
          // Create a dummy bet with zero stake for record keeping
          const newBet = new Bet2({
            user: userId, 
            label,
            odds,
            run,
            stake: 0,
            profit: 0,
            liability: 0,
            type,
            match,
          });
          
          const savedBet = await newBet.save();
          
          return res.status(201).json({
            success: true,
            message: 'Opposite bets cancelled successfully',
            bet: savedBet,
            updatedWallet: userWallet.balance,
          });
        }
        
        // Case 2: New stake is greater than opposite stake - cancel all opposite bets and create new bet with remaining stake
        else if (parseFloat(stake) > compareValue) {
          // Cancel all opposite bets
          for (const bet of oppositeBets) {
            // Return the stake to the wallet
            const returnAmount = parseFloat(bet.stake);
            userWallet.balance += returnAmount;
            
            // Update bet status
            bet.status = "Cancelled";
            await bet.save();
          }
          
          // Calculate remaining stake
          const remainingStake = parseFloat(stake) - compareValue;
          
          // Calculate amount to deduct from wallet for the new bet
          let deductAmount;
          if (type === "YES") {
            deductAmount = remainingStake;
          } else { // type === "NO"
            deductAmount = ((parseFloat(odds) / 100) * remainingStake).toFixed(2);
          }
          
          // Check if user has sufficient balance
          if (userWallet.balance < deductAmount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance for remaining stake' });
          }
          
          // Deduct the amount from wallet
          userWallet.balance -= deductAmount;
          await userWallet.save();
          
          // Create new bet with remaining stake
          const newBet = new Bet2({
            user: userId, 
            label,
            odds,
            run,
            stake: type === "YES" ? remainingStake : ((parseFloat(odds) / 100) * remainingStake).toFixed(2),
            profit: type === "YES" ? ((parseFloat(odds) / 100) * remainingStake).toFixed(2) : remainingStake,
            liability: 0,
            type,
            match,
          });
          
          const savedBet = await newBet.save();
          
          return res.status(201).json({
            success: true,
            message: 'Opposite bets cancelled and new bet placed with remaining stake',
            bet: savedBet,
            updatedWallet: userWallet.balance,
          });
        }
        
        // Case 3: New stake is less than opposite stake - reduce opposite bets proportionally
        else {
          let remainingStakeToCancel = parseFloat(stake);
          
          // Process each opposite bet until we've cancelled enough
          for (const bet of oppositeBets) {
            if (remainingStakeToCancel <= 0) break;
            
            const compareAmount = type === "YES" ? parseFloat(bet.profit) : parseFloat(bet.stake);
            
            if (compareAmount <= remainingStakeToCancel) {
              // Cancel this bet completely
              const returnAmount = parseFloat(bet.stake);
              userWallet.balance += returnAmount;
              
              // Update bet status
              bet.status = "Cancelled";
              await bet.save();
              
              remainingStakeToCancel -= compareAmount;
            } else {
              // Partially reduce this bet
              const reductionRatio = remainingStakeToCancel / compareAmount;
              const newStake = parseFloat(bet.stake) * (1 - reductionRatio);
              const newProfit = parseFloat(bet.profit) * (1 - reductionRatio);
              
              // Return the reduced portion of the stake to the wallet
              const returnAmount = parseFloat(bet.stake) * reductionRatio;
              userWallet.balance += returnAmount;
              
              // Update the bet with reduced stake and profit
              bet.stake = newStake.toFixed(2);
              bet.profit = newProfit.toFixed(2);
              await bet.save();
              
              remainingStakeToCancel = 0;
            }
          }
          
          await userWallet.save();
          
          // Create a dummy bet with zero stake for record keeping
          const newBet = new Bet2({
            user: userId, 
            label,
            odds,
            run,
            stake: 0,
            profit: 0,
            liability: 0,
            type,
            match,
          });
          
          const savedBet = await newBet.save();
          
          return res.status(201).json({
            success: true,
            message: 'Opposite bets reduced successfully',
            bet: savedBet,
            updatedWallet: userWallet.balance,
          });
        }
      }
    }
    
    // If no opposite bets or not a YES/NO bet, proceed with normal bet placement
    
    // Calculate the amount to deduct from wallet based on bet type
    let deductAmount = stake;
    let liability = 0;
    
    // For Khaai (Lay) bets, calculate liability
    if (type === "khaai") {
      liability = (odds / 100) * stake;
      deductAmount = liability; // For Khaai bets, we reserve the liability amount
    }
    
    if (userWallet.balance < deductAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    userWallet.balance -= deductAmount;
    await userWallet.save();
    
    const newBet = new Bet2({
      user: userId, 
      label,
      odds,
      run,
      stake,
      profit,
      liability,
      type,
      match,
    });

    // Save the bet
    const savedBet = await newBet.save();

    res.status(201).json({
      success: true,
      message: 'Bet placed successfully',
      bet: savedBet,
      updatedWallet: userWallet.balance,
    });
  } catch (err) {
    console.error('Error placing bet:', err);
    res.status(500).json({ success: false, message: 'Error placing bet', error: err.message });
  }
};




exports.getUserBets = async (req, res) => {
  const { userId } = req.params; 
 
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }
    const bets = await Bet2.find({ user: new mongoose.Types.ObjectId(userId) });
    if (!bets || bets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No bets found for this user',
      });
    }
   res.status(200).json({
      success: true,
      bets,
    });
  } catch (err) {
    console.error('Error fetching bets:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching bets',
    });
  }
};



exports.updateWallet = async (req, res) => {
  const { userId, amount } = req.body;

  try {
      // Find the user by ID
      const userWallet = await User_Wallet.findOne({ user: userId });
      if (!userWallet) {
          return res.status(404).json({ success: false, message: "User not found" });
      }

      // Update the wallet balance
      userWallet.balance += amount;
      await userWallet.save();

      res.json({ success: true, message: "Wallet updated successfully", walletBalance: userWallet.balance});
  } catch (error) {
      console.error("Error updating wallet:", error);
      res.status(500).json({ success: false, message: "Server error" });
  }
};

const bcrypt = require("bcryptjs"); 


exports.adminusersignup = async (req, res) => {
 
  try {
    const { username, email, password, balance } = req.body;

    if (!username || !email || !password || balance === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    // Save user first
    const savedUser = await newUser.save();

    // Create wallet for the user
    const wallet = new User_Wallet({
      user: savedUser._id,
      balance: balance, // Store initial balance
    });

    const savedWallet = await wallet.save();

    // Link wallet to user
    savedUser.wallet = savedWallet._id;
    await savedUser.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        balance: savedWallet.balance,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.allbetsupdate = async (req, res) => {
  try {
   

    // Fetch all bets with required fields
    const allBets = await Bet2.find().select("label odds stake profit type createdAt result match");

    console.log("Fetched Bets:", allBets.length);
    
    res.status(200).json({ success: true, data: allBets });
  } catch (error) {
    console.error("Error fetching bets:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateResultUserBet = async (req, res) => {
  try {
    const { label, result } = req.body;

    if (!label || !result) {
      return res.status(400).json({ success: false, message: "Label and result are required" });
    }

    // Find all pending bets that match the label
    const pendingBets = await Bet2.find({ label, status: "Pending" });

    if (pendingBets.length === 0) {
      return res.status(404).json({ success: false, message: "No pending bets found for this label" });
    }

    // Process each bet
    for (const bet of pendingBets) {
      // Handle YES/NO bets
      if (bet.type === "YES") {
        const userWallet = await User_Wallet.findOne({ user: bet.user });
        
        if (!userWallet) {
          console.error(`Wallet not found for user ${bet.user}`);
          continue;
        }
        
        // For YES bets, check if the run value matches the result
        if (parseFloat(bet.run) === parseFloat(result)) {
          // User wins - return stake and add profit
          userWallet.balance += parseFloat(bet.stake) + parseFloat(bet.profit);
          await userWallet.save();
          
          // Update bet status to "Win"
          await Bet2.findByIdAndUpdate(bet._id, { status: "Win", result: result });
        } else {
          // User loses - stake is already deducted
          await Bet2.findByIdAndUpdate(bet._id, { status: "Loss", result: result });
        }
      } 
      else if (bet.type === "NO") {
        const userWallet = await User_Wallet.findOne({ user: bet.user });
        
        if (!userWallet) {
          console.error(`Wallet not found for user ${bet.user}`);
          continue;
        }
        
        // For NO bets, check if the run value does NOT match the result
        if (parseFloat(bet.run) !== parseFloat(result)) {
          // User wins - return stake and add profit
          userWallet.balance += parseFloat(bet.stake) + parseFloat(bet.profit);
          await userWallet.save();
          
          // Update bet status to "Win"
          await Bet2.findByIdAndUpdate(bet._id, { status: "Win", result: result });
        } else {
          // User loses - stake is already deducted
          await Bet2.findByIdAndUpdate(bet._id, { status: "Loss", result: result });
        }
      }
      // Handle Khaai (Lay) bets
      else if (bet.type === "khaai" && bet.label === result) {
        // For Khaai (Lay) bets, if the team loses, user wins the stake amount
        const userWallet = await User_Wallet.findOne({ user: bet.user });

        if (userWallet) {
          // Return the liability (already deducted) and add the profit (stake amount)
          userWallet.balance += bet.liability + bet.profit;
          await userWallet.save();
        }

        // Update the bet status to "Win"
        await Bet2.findByIdAndUpdate(bet._id, { status: "Win", result: result });
      } 
      // Handle Lgaai (Back) bets
      else if (bet.type === "Lgaai" && bet.label === result) {
        // For Lgaai (Back) bets, if the team wins, user wins the profit (odds * stake / 100)
        const userWallet = await User_Wallet.findOne({ user: bet.user });

        if (userWallet) {
          // Return the stake (already deducted) and add the profit
          userWallet.balance += parseFloat(bet.stake) + parseFloat(bet.profit);
          await userWallet.save();
        }

        // Update the bet status to "Win"
        await Bet2.findByIdAndUpdate(bet._id, { status: "Win", result: result });
      } else {
        // If conditions are not satisfied, just update the bet status to "Loss"
        await Bet2.findByIdAndUpdate(bet._id, { status: "Loss", result: result });
      }
    }

    res.json({ success: true, message: "Bets updated successfully" });
  } catch (error) {
    console.error("Error updating bets:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.updatecricketlagaikhai = async (req, res) => {
  try {
    const { status, amount, userID } = req.body;

    if (!status || amount === undefined || !userID) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status, amount, and userID are required' 
      });
    }

    // Find the bet and update status
    const bet = await Bet2.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!bet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bet not found' 
      });
    }

    // Find the user's wallet
    const userWallet = await User_Wallet.findOne({ user: userID });

    if (!userWallet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Wallet not found' 
      });
    }

    // Update wallet balance with the exact amount passed from frontend
    const amountToAdd = parseFloat(amount);
    if (amountToAdd !== 0) {
      // Add the amount to the wallet
      userWallet.balance += amountToAdd;
      await userWallet.save();
      
      console.log(`Added ${amountToAdd} to wallet for user ${userID}. New balance: ${userWallet.balance}`);
    }

    // Fetch the updated wallet balance
    const updatedWallet = await User_Wallet.findOne({ user: userID });

    res.json({ 
      success: true, 
      message: `Bet status updated to ${status}${amountToAdd !== 0 ? ' and amount added to wallet' : ''}`, 
      bet, 
      walletBalance: updatedWallet.balance 
    });
  } catch (error) {
    console.error('Error updating bet and wallet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};


exports.calculateNetOutcome = async (req, res) => {
  try {
    const { userId, match } = req.params;
    
    if (!userId || !match) {
      return res.status(400).json({
        success: false,
        message: 'User ID and match are required',
      });
    }

    // Find all pending bets for this user and match
    const pendingBets = await Bet2.find({
      user: userId,
      match: match,
      status: "Pending"
    });

    if (pendingBets.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending bets found',
        outcomes: {}
      });
    }

    // Get unique team names from the bets
    const teams = [...new Set(pendingBets.map(bet => bet.label))];
    
    // Initialize outcomes object with potential win/loss for each team
    const outcomes = {};
    teams.forEach(team => {
      outcomes[team] = { 
        win: 0,  // Profit if this team wins
        lose: 0  // Loss if this team loses
      };
    });

    // Calculate potential outcomes for each bet
    pendingBets.forEach(bet => {
      const team = bet.label;
      
      if (bet.type === "Lgaai") {
        // For Lgaai (Back) bets:
        // If team wins: Add profit to this team's win
        outcomes[team].win += parseFloat(bet.profit);
        
        // If team loses: Add stake loss to this team's lose
        outcomes[team].lose -= parseFloat(bet.stake);
        
      } else if (bet.type === "khaai") {
        // For Khaai (Lay) bets:
        // If team loses: Add profit to this team's lose (it's a win when team loses)
        outcomes[team].lose += parseFloat(bet.profit);
        
        // If team wins: Add liability loss to this team's win (it's a loss when team wins)
        outcomes[team].win -= parseFloat(bet.liability);
      }
    });

    // For each team, calculate the potential outcomes for all other teams
    const completeOutcomes = {};
    teams.forEach(team => {
      completeOutcomes[team] = {};
      
      // For each team, calculate what happens if it wins or if other teams win
      teams.forEach(resultTeam => {
        if (team === resultTeam) {
          // If this team wins
          completeOutcomes[team].win = outcomes[team].win;
        } else {
          // If this team loses (another team wins)
          completeOutcomes[team].lose = outcomes[team].lose;
        }
      });
    });

    res.status(200).json({
      success: true,
      outcomes: completeOutcomes
    });
  } catch (error) {
    console.error('Error calculating net outcome:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating net outcome',
      error: error.message
    });
  }
};

exports.updateBet = async (req, res) => {
  try {
    const { stake, profit } = req.body;
    const betId = req.params.id;

    if (!betId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bet ID is required' 
      });
    }

    // Find the bet
    const bet = await Bet2.findById(betId);
    
    if (!bet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bet not found' 
      });
    }

    // Update bet details
    if (stake !== undefined) {
      bet.stake = parseFloat(stake).toFixed(2);
    }
    
    if (profit !== undefined) {
      bet.profit = parseFloat(profit).toFixed(2);
    }

    // Save the updated bet
    const updatedBet = await bet.save();

    res.json({ 
      success: true, 
      message: 'Bet updated successfully', 
      bet: updatedBet
    });
  } catch (error) {
    console.error('Error updating bet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

