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
    analyserNode.fftSize = 1024; 
    analyserNode.smoothingTimeConstant = 0.85;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    device.node.connect(analyserNode);
    analyserNode.connect(outputNode);

    // **Canvas für die Wellenform**
    const oscilloscopeCanvas = document.getElementById('oscilloscope-main');
    resizeCanvas(oscilloscopeCanvas);
    const oscilloscopeContext = oscilloscopeCanvas.getContext("2d");

    function resizeCanvas(canvas) {
        canvas.width = window.innerWidth;  
        canvas.height = 1200;               
    }

    function drawOscilloscope() {
        requestAnimationFrame(drawOscilloscope);
        analyserNode.getByteTimeDomainData(dataArray);

        // **Hintergrund löschen**
        oscilloscopeContext.clearRect(0, 0, oscilloscopeCanvas.width, oscilloscopeCanvas.height);

        // **Grüne Fläche bis zur Wellenlinie füllen**
        oscilloscopeContext.fillStyle = "rgba(0, 255, 130, 0.3)"; // Halbtransparentes Grün
        oscilloscopeContext.beginPath();

        const sliceWidth = oscilloscopeCanvas.width / bufferLength;
        let x = 0;

        // **Wellenform zeichnen und grüne Fläche darunter füllen**
        oscilloscopeContext.moveTo(0, oscilloscopeCanvas.height); // Startpunkt unten links

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 256.0;
            const y = (v * oscilloscopeCanvas.height * 0.3) + (oscilloscopeCanvas.height / 2); // Weniger hektisch (0.3 statt 0.4)

            // Grüne Fläche bis zur Wellenlinie
            oscilloscopeContext.lineTo(x, y);

            x += sliceWidth;
        }

        // **Grüne Fläche schließen**
        oscilloscopeContext.lineTo(oscilloscopeCanvas.width, oscilloscopeCanvas.height); // Nach unten rechts
        oscilloscopeContext.lineTo(0, oscilloscopeCanvas.height); // Zurück nach unten links
        oscilloscopeContext.closePath();
        oscilloscopeContext.fill(); // Grüne Fläche füllen

        // **Wellenform zeichnen**
        oscilloscopeContext.lineWidth = 2;
        oscilloscopeContext.strokeStyle = "rgba(0, 255, 130, 0.8)"; // Farbe der Wellenform
        oscilloscopeContext.stroke();
    }

    drawOscilloscope();

    // **Canvas soll sich anpassen, wenn Fenstergröße geändert wird**
    window.addEventListener("resize", () => {
        resizeCanvas(oscilloscopeCanvas);
    });
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