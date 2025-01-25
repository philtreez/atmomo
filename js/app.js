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
    analyserNode.fftSize = 2048; 
    analyserNode.smoothingTimeConstant = 0.85;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    device.node.connect(analyserNode);
    analyserNode.connect(outputNode);

    // **Erster Canvas (Hauptoszilloskop)**
    const oscilloscopeCanvas = document.getElementById('oscilloscope-main');
    resizeCanvas(oscilloscopeCanvas);
    const oscilloscopeContext = oscilloscopeCanvas.getContext("2d");

    // **Zweiter Canvas (Ghost-Welle)**
    const oscilloscopeGhostCanvas = document.getElementById('oscilloscope-ghost');
    resizeCanvas(oscilloscopeGhostCanvas);
    const oscilloscopeGhostContext = oscilloscopeGhostCanvas.getContext("2d");

    // **Dritter Canvas (Experimental)**
    const oscilloscopeExperimentalCanvas = document.getElementById('oscilloscope-experimental');
    resizeCanvas(oscilloscopeExperimentalCanvas);
    const oscilloscopeExperimentalContext = oscilloscopeExperimentalCanvas.getContext("2d");

    const analyserNodeExperimental = context.createAnalyser();
    analyserNodeExperimental.fftSize = 4096; // Andere FFT-Auflösung für mehr Details
    analyserNodeExperimental.smoothingTimeConstant = 1; // Weniger Glättung für schärfere Peaks
    const bufferLengthExp = analyserNodeExperimental.frequencyBinCount;
    const dataArrayExp = new Uint8Array(bufferLengthExp);

    device.node.connect(analyserNodeExperimental);

    function resizeCanvas(canvas) {
        canvas.width = window.innerWidth;  
        canvas.height = 430;               
    }

    function drawOscilloscope() {
        requestAnimationFrame(drawOscilloscope);
        analyserNode.getByteTimeDomainData(dataArray);

        // **Haupt-Visualisierung**
        oscilloscopeContext.clearRect(0, 0, oscilloscopeCanvas.width, oscilloscopeCanvas.height);
        oscilloscopeContext.lineWidth = 2;
        oscilloscopeContext.strokeStyle = "rgba(0, 255, 130, 0.8)";
        oscilloscopeContext.beginPath();

        const sliceWidth = oscilloscopeCanvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 256.0;
            const y = (v * oscilloscopeCanvas.height * 0.8) + (Math.sin(i * 0.02) * 20);

            if (i === 0) {
                oscilloscopeContext.moveTo(x, y);
            } else {
                oscilloscopeContext.lineTo(x, y);
            }

            x += sliceWidth;
        }
        oscilloscopeContext.lineTo(oscilloscopeCanvas.width, oscilloscopeCanvas.height / 2);
        oscilloscopeContext.stroke();

        // **Zweite Welle ("Ghost")**
        oscilloscopeGhostContext.clearRect(0, 0, oscilloscopeGhostCanvas.width, oscilloscopeGhostCanvas.height);
        oscilloscopeGhostContext.lineWidth = 4;
        oscilloscopeGhostContext.strokeStyle = "rgba(0, 200, 100, 0.5)";
        oscilloscopeGhostContext.beginPath();

        x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 256.0;
            const y = (v * oscilloscopeGhostCanvas.height * 1.2) + (Math.sin(i * 0.015) * 25);

            if (i === 0) {
                oscilloscopeGhostContext.moveTo(x, y);
            } else {
                oscilloscopeGhostContext.lineTo(x, y);
            }

            x += sliceWidth;
        }
        oscilloscopeGhostContext.lineTo(oscilloscopeGhostCanvas.width, oscilloscopeGhostCanvas.height / 2);
        oscilloscopeGhostContext.stroke();
    }

    function drawExperimentalOscilloscope() {
        requestAnimationFrame(drawExperimentalOscilloscope);
        analyserNodeExperimental.getByteTimeDomainData(dataArrayExp);

        oscilloscopeExperimentalContext.clearRect(0, 0, oscilloscopeExperimentalCanvas.width, oscilloscopeExperimentalCanvas.height);
        oscilloscopeExperimentalContext.lineWidth = 2.5;
        oscilloscopeExperimentalContext.strokeStyle = "rgba(50, 255, 135, 0.9)"; // Auffällige rote Linie für starken Kontrast
        oscilloscopeExperimentalContext.beginPath();

        const sliceWidthExp = oscilloscopeExperimentalCanvas.width / bufferLengthExp;
        let x = 0;

        for (let i = 0; i < bufferLengthExp; i++) {
            const v = dataArrayExp[i] / 128.0;
            const y = (v * oscilloscopeExperimentalCanvas.height * 0.6) + (Math.cos(i * 0.03) * 2 * Math.random()); // Verzerrung für glitchigen Effekt

            if (i === 0) {
                oscilloscopeExperimentalContext.moveTo(x, y);
            } else {
                oscilloscopeExperimentalContext.lineTo(x, y);
            }

            x += sliceWidthExp;
        }
        oscilloscopeExperimentalContext.lineTo(oscilloscopeExperimentalCanvas.width, oscilloscopeExperimentalCanvas.height / 2);
        oscilloscopeExperimentalContext.stroke();
    }

    drawOscilloscope();
    drawExperimentalOscilloscope();

    // **Canvas soll sich anpassen, wenn Fenstergröße geändert wird**
    window.addEventListener("resize", () => {
        resizeCanvas(oscilloscopeCanvas);
        resizeCanvas(oscilloscopeGhostCanvas);
        resizeCanvas(oscilloscopeExperimentalCanvas);
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
