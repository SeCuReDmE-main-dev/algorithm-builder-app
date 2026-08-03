const componentsLibrary = [
    {
        id: 'component-1',
        type: 'character-sheet',
        properties: {
            role: 'apprenti-des-deux-horizons',
            inventory: []
        }
    },
    {
        id: 'component-2',
        type: 'deterministic-die',
        properties: {
            sides: 6
        }
    },
    {
        id: 'component-3',
        type: 'force-block',
        properties: {
            direction: 'east',
            intensity: 3
        }
    },
    {
        id: 'component-4',
        type: 'trajectory-lab',
        properties: {
            origin: 'tower',
            bounds: 10
        }
    },
    {
        id: 'component-5',
        type: 'ascii-sky-map',
        properties: {
            width: 50
        }
    }
];

function createComponent(type, properties) {
    const id = `component-${componentsLibrary.length + 1}`;
    const newComponent = { id, type, properties };
    componentsLibrary.push(newComponent);
    return newComponent;
}

function saveComponent(component) {
    const index = componentsLibrary.findIndex(c => c.id === component.id);
    if (index !== -1) {
        componentsLibrary[index] = component;
    } else {
        componentsLibrary.push(component);
    }
}

function searchComponents(query) {
    return componentsLibrary.filter(component => 
        component.type.includes(query) || 
        Object.values(component.properties).some(value => value.toString().includes(query))
    );
}

async function emitAlgoQuestComponentEvent() {
    const adapter = window.AlgorithmBuilderAlgoQuestQbitAdapter;
    if (!adapter) {
        return null;
    }
    const latestComponent = componentsLibrary[componentsLibrary.length - 1];
    const importedMission = adapter.readMissionEnvelopeInbox && adapter.readMissionEnvelopeInbox();
    const missionContext = importedMission
        ? adapter.contextFromMissionEnvelope(importedMission.envelope)
        : null;
    return adapter.emitAlgorithmArtifactReceipt(latestComponent, missionContext || {
        mission_id: 'mage-two-horizons.primary-5-6.fr-CA.1',
        hero_book_id: 'mage-two-horizons',
        capability_refs: [latestComponent.type]
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const componentsContainer = document.getElementById('components');

    componentsLibrary.forEach(component => {
        const componentElement = document.createElement('div');
        componentElement.classList.add('component');
        componentElement.draggable = true;
        componentElement.dataset.type = component.type;
        componentElement.dataset.properties = JSON.stringify(component.properties);
        componentElement.textContent = component.type;
        componentsContainer.appendChild(componentElement);
    });

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search components...';
    componentsContainer.appendChild(searchInput);

    const algoQuestButton = document.createElement('button');
    algoQuestButton.type = 'button';
    algoQuestButton.id = 'algoquest-qbit-emit';
    algoQuestButton.textContent = 'Send to AlgoQuest';
    componentsContainer.appendChild(algoQuestButton);

    const algoQuestStatus = document.createElement('p');
    algoQuestStatus.id = 'algoquest-qbit-status';
    algoQuestStatus.textContent = 'AlgoQuest event pending';
    componentsContainer.appendChild(algoQuestStatus);

    const missionInput = document.createElement('textarea');
    missionInput.id = 'algoquest-mission-envelope';
    missionInput.rows = 8;
    missionInput.placeholder = 'Paste AlgoQuest MissionEnvelope JSON here.';
    componentsContainer.appendChild(missionInput);

    const missionImportButton = document.createElement('button');
    missionImportButton.type = 'button';
    missionImportButton.id = 'algoquest-mission-import';
    missionImportButton.textContent = 'Import Mission';
    componentsContainer.appendChild(missionImportButton);

    const algoQuestReceipt = document.createElement('textarea');
    algoQuestReceipt.id = 'algoquest-qbit-receipt';
    algoQuestReceipt.readOnly = true;
    algoQuestReceipt.rows = 10;
    algoQuestReceipt.placeholder = 'Validated AlgoQuest receipt JSON appears here.';
    componentsContainer.appendChild(algoQuestReceipt);

    missionImportButton.addEventListener('click', async () => {
        const adapter = window.AlgorithmBuilderAlgoQuestQbitAdapter;
        if (!adapter) {
            algoQuestStatus.textContent = 'AlgoQuest adapter unavailable';
            return;
        }
        try {
            const envelope = JSON.parse(missionInput.value);
            const receipt = await adapter.importMissionEnvelope(envelope);
            algoQuestStatus.textContent = receipt.status === 'accepted'
                ? `Mission imported: ${receipt.mission_id}`
                : `Mission rejected: ${receipt.errors.join(', ') || receipt.reason}`;
        } catch (error) {
            algoQuestStatus.textContent = 'Mission rejected: invalid JSON';
        }
    });

    algoQuestButton.addEventListener('click', async () => {
        algoQuestStatus.textContent = 'AlgoQuest receipt building...';
        const event = await emitAlgoQuestComponentEvent();
        algoQuestReceipt.value = event ? JSON.stringify(event, null, 2) : '';
        algoQuestStatus.textContent = event
            ? `AlgoQuest receipt ready: ${event.receipt_id}`
            : 'AlgoQuest adapter unavailable';
    });

    searchInput.addEventListener('input', (event) => {
        const query = event.target.value;
        const results = searchComponents(query);
        componentsContainer.innerHTML = '';
        results.forEach(component => {
            const componentElement = document.createElement('div');
            componentElement.classList.add('component');
            componentElement.draggable = true;
            componentElement.dataset.type = component.type;
            componentElement.dataset.properties = JSON.stringify(component.properties);
            componentElement.textContent = component.type;
            componentsContainer.appendChild(componentElement);
        });
        componentsContainer.appendChild(searchInput);
        componentsContainer.appendChild(algoQuestButton);
        componentsContainer.appendChild(algoQuestStatus);
        componentsContainer.appendChild(missionInput);
        componentsContainer.appendChild(missionImportButton);
        componentsContainer.appendChild(algoQuestReceipt);
    });
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        componentsLibrary,
        createComponent,
        saveComponent,
        searchComponents,
        emitAlgoQuestComponentEvent,
    };
}
