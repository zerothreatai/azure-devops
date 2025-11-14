import * as core from 'azure-pipelines-task-lib/task';
import axios from 'axios';

async function run() {
    try {
        const token = core.getInput('zt_token',  true);
        const onPremProxyUrl = core.getInput('on_prem_proxy_api_url',  false);
        const waitForAnalysisInput = core.getInput('wait_for_analysis', false);
        const waitForAnalysis = waitForAnalysisInput?.toLowerCase() === 'true';
        console.log(`Initiating security scan request`);

        // Initiate the scan
        const apiUrl = `${onPremProxyUrl || 'https://api.zerothreat.ai'}/api/scan/devops`;
        const initiateResponse = await axios.post(apiUrl, { token });
        const response = initiateResponse.data;
        const code = response.code;
        if(response.status == 200)
            if(!waitForAnalysis)
            core.setResult(core.TaskResult.Succeeded, `Scan Started Successfully, Here is the scan report url for more detail ${response.url}.`);
        else
            core.setResult(core.TaskResult.Failed, `Scan not started.\nReason: ${response.message}`);

            let intervalId:any = undefined
        async function checkScanStatus(){
            if(intervalId)
                clearInterval(intervalId);
            try {
                const axiosResponse = await axios.get(`${apiUrl}/${code}`);
                const response = axiosResponse.data;
                if (response.scanStatus >= 4) {
                    core.setResult(core.TaskResult.Succeeded,`Scan completed successfully, for more detail please visit the portal.`);
                }else{
                    console.log(`Scan is inprogress [${new Date().toString()}].`);
                    intervalId = setInterval(async ()=>{await checkScanStatus()},300000)
                }
                    
            } catch (error) {
                clearInterval(intervalId);
                console.error(`Status polling failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        if(waitForAnalysis){
            checkScanStatus();
        }

    } catch (error) {
        core.setResult(core.TaskResult.Failed, `Action failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

run();