const  gamesQueue  = require("../queues/gamesQueue");

const getJobStatus = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await gamesQueue.getJob(jobId);
        console.log('JOBS', job);
        const status = await job.getState();
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json({ status: status, id: jobId });
    } catch (error) {
        res.status(500).json({ error: error.message });

    }
}

module.exports = {
    getJobStatus
}