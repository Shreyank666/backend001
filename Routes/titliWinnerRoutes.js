const express = require("express");
const router = express.Router();
const titliWinnerController = require("../controller/titliWinnerController");

// Routes to handle images and their status
// router.post("/titli/random-image", titliWinnerController.postImage);
router.post("/titli/update-random-image", titliWinnerController.updateRandomImage);
router.get("/titli/get-random-image", titliWinnerController.getRandomImage);
// router.get("/titli/get-all-images", titliWinnerController.getAllImages);
router.get("/titli/get-all-random-images", titliWinnerController.getAllRandomImages);
router.get("/titli/get-all-images-from-array", titliWinnerController.getAllImagesFromArray);
router.get("/titli/get-all-allow-images-from-array", titliWinnerController.getRandomAllowedImageFromArray);
router.put("/titli/update-is-allowed", titliWinnerController.updateIsAllowed);

module.exports = router;