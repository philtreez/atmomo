async function setup() {
    const patchExportURL = "https://atmomo-philtreezs-projects.vercel.app/export/patch.export.json";

    // Create AudioContext
    const WAContext = window.AudioContext || window.webkitAudioContext;
    const context = new WAContext();

    // Create gain node and connect it to audio output
    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    try {
        // Fetch the exported patcher
        const response = await fetch(patchExportURL);
        if (!response.ok) throw new Error("Failed to fetch patcher file");
        const patcher = await response.json();

        if (!window.RNBO) {
            // Load RNBO script dynamically
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }

        // Create RNBO Patch
        const device = await RNBO.createDevice({ context, patcher });
        device.node.connect(outputNode);

        // Ensure AudioContext is resumed on user interaction
        if (context.state === "suspended") {
            window.addEventListener("click", () => context.resume(), { once: true });
        }

    } catch (err) {
        console.error("Error setting up RNBO:", err);
    }
}

function loadRNBOScript(version) {
    return new Promise((resolve, reject) => {
        if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
            return reject(new Error("Patcher exported with a Debug Version! Please specify the correct RNBO version."));
        }
        const el = document.createElement("script");
        el.src = `https://c74-public.nyc3.digitaloceanspaces.com/rnbo/${encodeURIComponent(version)}/rnbo.min.js`;
        el.onload = resolve;
        el.onerror = err => reject(new Error("Failed to load rnbo.js v" + version));
        document.body.append(el);
    });
}

setup();
