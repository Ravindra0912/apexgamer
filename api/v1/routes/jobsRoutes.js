const express = require("express");
const { getJobStatus } = require("../controller/jobController");

const router = express.Router();

router.get("/:id", getJobStatus);

module.exports = router;

