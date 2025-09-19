let inProgress = false;

document.getElementById('requestInterval').addEventListener('change', async function() {
    riv = document.getElementById('requestInterval').value
    document.getElementById('requestIntervalValue').innerHTML = riv + " ms"
    fetch(`/interval?rate=${riv}`)
        .catch(error => console.error('Error fetching treatment:', error));
});

document.getElementById('treatmentError').addEventListener('change', async function() {
    te = document.getElementById('treatmentError').value
    document.getElementById('treatmentErrorValue').innerHTML = te + "%"
    fetch(`/errorrate?rate=${te}&group=treatment`)
        .catch(error => console.error('Error fetching treatment:', error));
});

document.getElementById('controlError').addEventListener('change', async function() {
    ce = document.getElementById('controlError').value
    document.getElementById('controlErrorValue').innerHTML = ce + "%"
    fetch(`/errorrate?rate=${ce}&group=control`)
        .catch(error => console.error('Error fetching control:', error));
});

document.getElementById('resetCounters').addEventListener('click', async function() {
    fetch(`/resetcounter`)
        .then(response => response.json())
        .then(data => {
            updateRolloutValues(data);
        })
        .catch(error => console.error('Error fetching data:', error));
});

document.getElementById('endTesting').addEventListener('click', async function() {
    inProgress = false;
    clearInterval(timer);
    seconds = 0;
    timer = 0;
});

document.getElementById('startTesting').addEventListener('click', async function() {
    if (timer == 0) {
        document.getElementById('timer').textContent = '00:00:00';
        timer = setInterval(updateTimer, 1000);
    }
    
    if(document.getElementById('cb5').checked) {
        console.log("Client Side")
        doClientSideSimulation();
    } else {
        console.log("Server Side")
        doServerSideSimulation();
        
    }
});

async function doClientSideSimulation() {
    inProgress = true
    aErrorRate = document.getElementById('controlError').value
    bErrorRate = document.getElementById('treatmentError').value
    while (inProgress) {
        await new Promise(r => setTimeout(r, document.getElementById('requestInterval').value));
        clientcontext = {
        kind: 'user',
        key: 'client-side-user-key',
        name: 'Mandy'
        };
        context.key = generateRandomUser();
        await ldclient.identify(clientcontext); 

        const flagValue = await ldclient.variation(flagKey, context, false);
        const error = await sendError(flagValue, aErrorRate, bErrorRate);
        fetch(`/clientside?flagValue=${flagValue}&error=${error}&context=${context.key}`)
            .then(response => response.json())
            .then(data => {
                updateRolloutValues(data);
                updateRawValues(data);
        })
        .catch(error => console.error('Error fetching data:', error));
    }
    
}

async function doServerSideSimulation() {
    inProgress = true
    while (inProgress) {
        await new Promise(r => setTimeout(r, document.getElementById('requestInterval').value));
        fetch(`/flag?input=nothing`)
            .then(response => response.json())
            .then(data => {
                updateRolloutValues(data);
                updateRawValues(data);
        })
        .catch(error => console.error('Error fetching data:', error));
    }
}

// Chart JS
var ctx = document.getElementById('controlChart').getContext('2d');

const controlChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Control Variant'],
        datasets: [{
            label: 'No error',
            data: [1],
            backgroundColor: [
                'rgba(116, 169, 8, 0.2)'
            ],
            borderColor: [
                'rgb(54, 235, 99)'
            ],
            borderWidth: 2
        },
        {label: 'Errors',
            data: [2],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
        }
    ]
    },
    options: {
        scales: {
            x: {
                stacked: true,
                beginAtZero: true
            },
            y: {
                stacked: true,
                beginAtZero: true
            }
        }
    }
});

var ctx = document.getElementById('treatmentChart').getContext('2d');

const treatmentChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Treatment Variant'],
        datasets: [{
            label: 'No error',
            data: [100],
            backgroundColor: [
                'rgba(116, 169, 8, 0.2)'
            ],
            borderColor: [
                'rgb(54, 235, 99)'
            ],
            borderWidth: 2
        },
        {label: 'Errors',
            data: [10],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
        }
    ]
    },
    options: {
        scales: {
            x: {
                stacked: true,
                beginAtZero: true
            },
            y: {
                stacked: true,
                beginAtZero: true
            }
        }
    }
});

let timer = 0;
let seconds = 0;

function updateRolloutValues(data) {
    controlChart.data.datasets[1].data[0] = data.falseErrorCount
    controlChart.data.datasets[0].data[0] = data.falseVariantCount - data.falseErrorCount
    treatmentChart.data.datasets[1].data[0] = data.trueErrorCount
    treatmentChart.data.datasets[0].data[0] = data.trueVariantCount - data.trueErrorCount
    controlChart.update();
    treatmentChart.update();
}

function updateRawValues(data) {
    document.getElementById('rawTreatmentErrors').textContent = data.trueErrorCount;
    document.getElementById('rawTreatmentTotal').textContent = data.trueVariantCount;
    document.getElementById('rawTreatmentPercent').textContent = data.trueVariantCount == 0 ? 0 : (data.trueErrorCount / data.trueVariantCount * 100).toFixed(1);
    document.getElementById('rawControlErrors').textContent = data.falseErrorCount;
    document.getElementById('rawControlTotal').textContent = data.falseVariantCount;
    document.getElementById('rawControlPercent').textContent = data.falseVariantCount == 0 ? 0 : (data.falseErrorCount / data.falseVariantCount * 100).toFixed(1);
 
}

function updateTimer() {
    seconds++;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    document.getElementById('timer').textContent = 
        String(hours).padStart(2, '0') + ':' + 
        String(minutes).padStart(2, '0') + ':' + 
        String(secs).padStart(2, '0');
}

document.addEventListener("DOMContentLoaded", function() {
    fetch('/flag?input=nothing')
        .then(response => response.json())
        .then(data => {
            document.getElementById('requestInterval').value = data.requestInterval;
            document.getElementById('requestIntervalValue').innerHTML = data.requestInterval + "ms";
            document.getElementById('treatmentError').value = data.errorBRate;
            document.getElementById('controlError').value = data.errorARate;
            document.getElementById('treatmentErrorValue').innerHTML = data.errorBRate + "%"
            document.getElementById('controlErrorValue').innerHTML = data.errorARate + "%"

            updateRawValues(data);
            updateRolloutValues(data);
        })
        .catch(error => console.error('Error fetching data:', error));
});
      
