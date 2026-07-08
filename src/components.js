const componentsLibrary = [
    {
        id: 'component-1',
        type: 'loop',
        properties: {
            iterations: 10
        }
    },
    {
        id: 'component-2',
        type: 'conditional',
        properties: {
            condition: 'x > 5'
        }
    },
    {
        id: 'component-3',
        type: 'function',
        properties: {
            name: 'myFunction',
            parameters: ['x', 'y']
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

function emitAlgoQuestComponentEvent() {
    const adapter = window.AlgorithmBuilderAlgoQuestQbitAdapter;
    if (!adapter) {
        return null;
    }
    const latestComponent = componentsLibrary[componentsLibrary.length - 1];
    const artifactRef = `algorithm-builder:component:${latestComponent.id}`;
    return adapter.emitAlgoQuestLearningEvent(artifactRef, 93);
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

    algoQuestButton.addEventListener('click', () => {
        const event = emitAlgoQuestComponentEvent();
        algoQuestStatus.textContent = event
            ? `AlgoQuest event ready: ${event.artifact_ref}`
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
