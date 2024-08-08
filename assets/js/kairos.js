import * as params from '@params';

function getSelectValueFromText(text) {
    const options = document.getElementById('distro-select');

    for (let i = 0; i < options.length; i++) {
        if (options[i].text === text) {
            return options[i].value;
        }
    }
    return null; // If the text is not found
}

function calculateBaseImage(distroInfo) {
    let baseImage = distroInfo[1] + ':' + distroInfo[2];

    // Special case for OpenSUSE since they use a slash to separate the family and flavor
    // e.g. opensuse/leap:15.6 and opensuse/tumbleweed (notice that this last one has no tag but it uses the latest tag by default)
    if (distroInfo[1] == 'opensuse') {
        baseImage = distroInfo[1] + '/' + distroInfo[2].replace('-', ':');
    } 

    return baseImage;
}

function encodeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function decodeHTML(str) {
    const temp = document.createElement('div');
    temp.innerHTML = str;
    return temp.textContent;
}

function replaceVariables(content, distroInfo) {
    const familyRegex = new RegExp(/@family/, 'gi');
    const flavorRegex = new RegExp(/@flavor/, 'gi');
    const flavorReleaseRegex = new RegExp(/@flavorRelease/, 'gi');
    const baseImageRegex = new RegExp(/@baseImage/, 'gi');

    return content.replace(familyRegex, distroInfo[0])
                  .replace(flavorReleaseRegex, distroInfo[2])
                  .replace(flavorRegex, distroInfo[1])
                  .replace(baseImageRegex, calculateBaseImage(distroInfo));
}

function replaceContent(distroInfo) {
    let newDistroInfo = distroInfo;
    const highlightElements = document.querySelectorAll('.highlight');
    const metaDistroElements = document.querySelectorAll('.meta-distro');
    let onlyDistros = [];


    highlightElements.forEach(highlightElement => {
        let newDistroInfo = distroInfo;
        // Extract the class list
        const classList = highlightElement.className.split(' ');

        // Find the class that starts with "only-flavors="
        const flavorClass = classList.find(cls => cls.startsWith('only-flavors='));

        if (flavorClass) {
            // Extract the values part of the class
            const values = flavorClass.split('=')[1];
            const isList = values.includes(',');
            if (isList) {
                onlyDistros = values.split(',');
            } else {
                onlyDistros = [values];
            }
        } else {
            onlyDistros = [];
        }

        const distroInfoName = distroInfo[1].toLowerCase() + '+' + distroInfo[2];

        if (onlyDistros.length > 0 && !onlyDistros.map(distro => distro.toLowerCase()).includes(distroInfoName)) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-warning autogenerated';
            alertDiv.setAttribute('role', 'alert');

            const alertHeading = document.createElement('h4');
            alertHeading.className = 'alert-heading';
            alertHeading.textContent = 'Flavor Incompatibility';

            const alertText = document.createElement('p');
            
            alertText.innerHTML = 'Your selected flavor is not compatible with this feature, the only available flavors for this feature are: ' + onlyDistros.join(', ').replace(/\+/g, ' ');

            // Append the heading and text to the alert div
            alertDiv.appendChild(alertHeading);
            alertDiv.appendChild(alertText);

            // Insert the new alert div above the highlight element
            highlightElement.parentNode.insertBefore(alertDiv, highlightElement);

            console.log(onlyDistros[0])
            const availableDistro = getSelectValueFromText(onlyDistros[0].replace(/\+/g, ' '));
        console.log(availableDistro)
            newDistroInfo = availableDistro.split(';');
        }

        const preTags = highlightElement.querySelectorAll('pre');
        const aTags = highlightElement.querySelectorAll('a');

        const elements = [...preTags, ...aTags];
        elements.forEach(e => {
            e.innerHTML = decodeHTML(replaceVariables(e.dataset.originalContent, newDistroInfo));
        });
        aTags.forEach(a => {
            a.href = replaceVariables(a.dataset.originalHref, newDistroInfo);

        });
    });

    metaDistroElements.forEach(e => {
        e.innerHTML = decodeHTML(replaceVariables(e.dataset.originalContent, newDistroInfo));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const distroSelect = document.getElementById('distro-select');
    let distroInfo = [params.defaultFamily, params.defaultFlavor, params.defaultFlavorRelease];
    const highlightElements = document.querySelectorAll('.highlight');
    const metaDistroElements = document.querySelectorAll('.meta-distro');
    metaDistroElements.forEach(e => {
        e.dataset.originalContent = encodeHTML(e.innerHTML);
    });

    highlightElements.forEach(highlightElement => {
        const preElements = highlightElement.querySelectorAll('pre');
        const aElements = highlightElement.querySelectorAll('a');
        const elements = [...preElements, ...aElements];
        elements.forEach((e, i) => {
            e.dataset.originalContent = encodeHTML(e.innerHTML);
        });
        aElements.forEach(a => {
            a.dataset.originalHref = a.href;
        });
    });

    const savedDistro = localStorage.getItem('selectedDistro');
    if (savedDistro) {
        if (distroSelect) {
            distroSelect.value = savedDistro;
        }
        distroInfo = savedDistro.split(';');
    } else {
        if (distroSelect) {
            const defaultDistro = distroInfo.join(';');
            distroSelect.value = defaultDistro;
        }
    }

    const generatedAlertElements = document.querySelectorAll('.alert-warning.autogenerated');
    generatedAlertElements.forEach(alert => {
        alert.remove();
    });

    replaceContent(distroInfo);

    if (distroSelect) {
        distroSelect.addEventListener('change', () => {
            const generatedAlertElements = document.querySelectorAll('.alert-warning.autogenerated');
            generatedAlertElements.forEach(alert => {
                alert.remove();
            });
            const selectedDistro = distroSelect.value;
            const selectedDistroArry = selectedDistro.split(';');
            const plausibleDistro = selectedDistroArry[1] + ' ' + selectedDistroArry[2];
            plausible('Change Flavor', { props: { distro: plausibleDistro, flavor: selectedDistroArry[1], flavor_release: selectedDistroArry[2] } });
            localStorage.setItem('selectedDistro', selectedDistro);
            replaceContent(selectedDistro.split(';'));
        });
    }
});