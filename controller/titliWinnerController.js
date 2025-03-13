const titliWinnerModel = require('../models/TitliWinner');

// Image list with amount and availability
let images = [
    { image: "butterfly.jpg", amount: 50, isAllowed: false },
    { image: "cow.jpg", amount: 30, isAllowed: false },
    { image: "football.jpg", amount: 20, isAllowed: false },
    { image: "spin.jpg", amount: 25, isAllowed: false },
    { image: "flower.webp", amount: 15, isAllowed: false },
    { image: "diya.webp", amount: 40, isAllowed: false },
    { image: "bucket.jpg", amount: 10, isAllowed: false },
    { image: "kite.webp", amount: 35, isAllowed: false },
    { image: "rat.webp", amount: 45, isAllowed: false },
    { image: "umberlla.jpg", amount: 60, isAllowed: false },
    { image: "parrot.webp", amount: 55, isAllowed: false },
    { image: "sun.webp", amount: 70, isAllowed: false }
];

// Function to get a random allowed image
const getRandomAllowedImage = () => {
    const allowedImages = images.filter(img => img.isAllowed);
    
    if (allowedImages.length === 0) {
        return null; // or handle the case when there are no allowed images
    }
    const randomIndex = Math.floor(Math.random() * allowedImages.length);
    return allowedImages[randomIndex].image;
};

// API to update a random allowed image
exports.updateRandomImage = async (req, res) => {
    try {
        const randomImage = getRandomAllowedImage();
        if (!randomImage) {
            return res.status(400).json({ message: "No allowed images available." });
        }
        // Save the randomly selected image to the database
        const newEntry = await titliWinnerModel.create({ randomImage });

        res.status(200).json({ message: "Random image updated successfully!", randomImage: newEntry.randomImage });

    } catch (error) {
        console.error("Error updating random image:", error);
        res.status(500).json({ message: error.message });
    }
};

// API to fetch the latest allowed random image
exports.getRandomImage = async (req, res) => {
    try {
        const latestEntry = await titliWinnerModel.find().sort({ createdAt: -1 });
        if (!latestEntry) {
            return res.status(404).json({ message: "No random images found." });
        }
        // const randomImage = latestEntry.length >= 2 && latestEntry[0].randomImage === latestEntry[1].randomImage ?
        //     images[Math.floor(Math.random() * images.length)].image :
        //     getRandomAllowedImage();
        const randomImage = getRandomAllowedImage();
        res.status(200).json({ randomImage });
    } catch (error) {
        console.error("Error fetching random image:", error);
        res.status(500).json({ message: error.message });
    }
};

// API to update the isAllowed status of an image
exports.updateIsAllowed = async (req, res) => {
    try {
        const { image, isAllowed } = req.body;

        // console.log("Received request:", image, isAllowed);

        if (!image) {
            return res.status(400).json({ message: "Image URL is required." });
        }

        // 🔍 Debug: Check if the image exists before updating
        const existingEntry = await titliWinnerModel.findOne({ "Images.image": image });

        if (!existingEntry) {
           
            return res.status(404).json({ message: "Image not found in database." });
        }

        // ✅ Update the `isAllowed` field
        const updatedEntry = await titliWinnerModel.findOneAndUpdate(
            { "Images.image": image },
            { $set: { "Images.$.isAllowed": isAllowed } },
            { new: true }
        );

        // console.log("✅ Image updated successfully:", updatedEntry);

        res.status(200).json({
            message: "Image updated successfully!",
            updatedImage: updatedEntry.Images.find(img => img.image === image)
        });

    } catch (error) {
        console.error("❌ Error updating image:", error);
        res.status(500).json({ message: "Internal server error.", error: error.message });
    }
};

// API to fetch all saved random images
exports.getAllRandomImages = async (req, res) => {
    try {
        const data = await titliWinnerModel.find().sort({ createdAt: -1 });
        if (data.length === 0) {
            const newEntry = new titliWinnerModel({ Images: images });
            await newEntry.save();
            data.push(newEntry);
        }
        res.status(200).json({ randomImages: data });
    } catch (error) {
        console.error("Error fetching random images:", error);
        res.status(500).json({ message: error.message });
    }
};

// API to get all images from the array
exports.getAllImagesFromArray = (req, res) => {
    try {
        res.status(200).json({ images });
    } catch (error) {
        console.error("Error fetching images from array:", error);
        res.status(500).json({ message: error.message });
    }
};

// API to get a random allowed image from the array
exports.getRandomAllowedImageFromArray = (req, res) => {
    try {
        // const randomImage = getRandomAllowedImage();
        const allowedImages = images.filter(img => img.isAllowed);
        // console.log(allowedImages);
        if (!allowedImages) {
            return res.status(404).json({ message: "No allowed images available." });
        }
        res.status(200).json({ allowedImages });
    } catch (error) {
        console.error("Error fetching random allowed image:", error);
        res.status(500).json({ message: error.message });
    }
};