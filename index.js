const axios = require('axios')
const githubUrl = "https://api.github.com"
const username = "miwebst"
const repo = "ssRunnerAngular"
const branch = "master"
const token = "" // Add your own access token here
const previewAcceptHeader = "application/vnd.github.antiope-preview+json"

const makeGithubGetRequest = async (path) => {
    try {
      const uri = githubUrl + path;
      return await axios.get(uri,
        {
            headers: {
                "Authorization": "token " + token,
                "User-Agent": 'miwebstpolling',
                "Accept": previewAcceptHeader
            }
        });
    } catch (error) {
      console.error(error)
    }
  }

const printStep = (step) => {
    console.log("Step Number: " + step.number);
    console.log("Step: " + step.name);
    console.log("Status: " + step.status);
    console.log("Conclusion: " + step.conclusion + "\n");
}

const checkAndPoll = async () => {
    const repoPath = "/repos/" + username + "/" + repo;
    const commitsPath = repoPath + "/commits/";
    const lastCommitPath = commitsPath + branch;
    var lastCommitResponse = await makeGithubGetRequest(lastCommitPath);
    var lastCommitSha = lastCommitResponse.data.sha;
    console.log("Found last commit to be: " + lastCommitSha);

    // This is a preview api call - it may change
    var checkRunPath = commitsPath + lastCommitSha + "/check-runs";
    var checkRunResponse = await makeGithubGetRequest(checkRunPath);
    var matchingCheckRunId = null;
    // Find the build and deploy check run
    checkRunResponse.data.check_runs.forEach(checkRun => {
        if (checkRun.name === 'Build and Deploy Job'){
            matchingCheckRunId = checkRun.id;
        }
    });

    if (matchingCheckRunId == null)
    {
        console.log("Failed to find check run id");
        return;
    }

    console.log("Found matching check run id: " + matchingCheckRunId);

    // Use github action jobs API (job is really a check run to get steps)
    const jobPath = repoPath + "/actions/jobs/" + matchingCheckRunId;
    var jobResponse = await makeGithubGetRequest(jobPath);
    var steps = jobResponse.data.steps;
    var areAllStepsCompleted = steps.length != 0 && steps.every((step) => step.status === 'completed');

    if (areAllStepsCompleted)
    {
        steps.forEach((step)=>{
            printStep(step);
        });
    }

    while (!areAllStepsCompleted)
    {
        // Wait 15 seconds then poll again
        await new Promise(resolve => setTimeout(resolve, 15000));
        jobResponse = await makeGithubGetRequest(jobPath);
        steps = jobResponse.data.steps;
        areAllStepsCompleted = steps.every((step) => step.status === 'completed');

        console.log("Remaining steps: ");
        steps.forEach((step)=>{
            if (step.status != 'completed')
            {
                printStep(step);
            }
        });
    }

    console.log("All jobs are done!");
}

checkAndPoll()