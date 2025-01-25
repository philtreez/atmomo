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

        setupOscilloscope(context, device, outputNode);

    } catch (err) {
        console.error("Error setting up RNBO:", err);
    }
}

function setupOscilloscope(context, device, outputNode) {
    const analyserNode = context.createAnalyser();
    analyserNode.fftSize = 1024; // Kleinere FFT-Größe für ruhigere Bewegung
    analyserNode.smoothingTimeConstant = 0.85; // Sanftere Übergänge

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    device.node.connect(analyserNode); // Verbinde Analyser mit dem Audio-Ausgang
    analyserNode.connect(outputNode);

    const oscilloscopeCanvas = document.getElementById('oscilloscope');
    oscilloscopeCanvas.width = oscilloscopeCanvas.offsetWidth;
    oscilloscopeCanvas.height = 430;
    const oscilloscopeContext = oscilloscopeCanvas.getContext("2d");

    function drawOscilloscope() {
        requestAnimationFrame(drawOscilloscope);
        analyserNode.getByteTimeDomainData(dataArray);

        // Hintergrund langsam verblassen lassen für einen weichen Verlauf
        oscilloscopeContext.fillStyle = "rgba(0, 0, 0, 0.1)";
        oscilloscopeContext.fillRect(0, 0, oscilloscopeCanvas.width, oscilloscopeCanvas.height);

        oscilloscopeContext.lineWidth = 2;
        oscilloscopeContext.strokeStyle = "rgba(0, 255, 130, 0.8)";
        oscilloscopeContext.beginPath();

        const sliceWidth = oscilloscopeCanvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 256.0;

            // Variiere die Höhe durch Skalierung und zufällige Verschiebung
            const y = (v * oscilloscopeCanvas.height * 0.8) + (Math.sin(i * 0.02) * 10);

            if (i === 0) {
                oscilloscopeContext.moveTo(x, y);
            } else {
                oscilloscopeContext.lineTo(x, y);
            }

            x += sliceWidth;
        }

        oscilloscopeContext.lineTo(oscilloscopeCanvas.width, oscilloscopeCanvas.height / 2);
        oscilloscopeContext.stroke();
    }

    drawOscilloscope(); // Zeichnen starten
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
