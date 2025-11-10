// Simple in-memory job queue for storing scraping results
// Jobs expire after 10 minutes

const jobs = new Map();

/**
 * Create a new scraping job
 * @returns {string} jobId
 */
export function createJob() {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  jobs.set(jobId, {
    id: jobId,
    status: 'processing',
    createdAt: new Date().toISOString(),
    result: null,
    error: null
  });
  
  // Clean up old jobs (older than 10 minutes)
  cleanupOldJobs();
  
  return jobId;
}

/**
 * Update job status
 */
export function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
    job.updatedAt = new Date().toISOString();
  }
}

/**
 * Get job by ID
 */
export function getJob(jobId) {
  return jobs.get(jobId);
}

/**
 * Set job result
 */
export function setJobResult(jobId, result) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date().toISOString();
  }
}

/**
 * Set job error
 */
export function setJobError(jobId, error) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'failed';
    job.error = error.message || String(error);
    job.failedAt = new Date().toISOString();
  }
}

/**
 * Clean up jobs older than 10 minutes
 */
function cleanupOldJobs() {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  for (const [jobId, job] of jobs.entries()) {
    const jobAge = now - new Date(job.createdAt).getTime();
    if (jobAge > maxAge) {
      jobs.delete(jobId);
    }
  }
}

// Clean up old jobs every 5 minutes
setInterval(cleanupOldJobs, 5 * 60 * 1000);

