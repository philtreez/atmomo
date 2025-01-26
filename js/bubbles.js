let bubbles = [];

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight, WEBGL); // Canvas an Fenstergröße anpassen
  canvas.parent('p5-canvas'); // Canvas in das div-Element einbinden
  for (let i = 0; i < 50; i++) {
    bubbles.push(new Bubble());
  }
  noStroke();
}

function draw() {
  clear(); // Löscht den Hintergrund und macht ihn transparent
  // background(200); <-- Diese Zeile entfernen oder auskommentieren

  // Kamera-Steuerung mit der Maus
  orbitControl();

  // Zeichne alle Sphären
  for (let bubble of bubbles) {
    bubble.move();
    bubble.show();
  }
}

class Bubble {
  constructor() {
    this.x = random(-width / 2, width / 2); // Zufällige x-Position im 3D-Raum
    this.y = height / 2 + random(100); // Startposition unten
    this.z = random(-width / 2, width / 2); // Zufällige z-Position im 3D-Raum
    this.size = random(2, 30); // Zufällige Größe der Sphäre
    this.speed = random(1, 3); // Zufällige Geschwindigkeit
  }

  move() {
    this.y -= this.speed; // Bewegung nach oben
    if (this.y < -height / 2) { // Wenn die Sphäre den oberen Rand verlässt
      this.y = height / 2 + this.size; // Zurück nach unten
      this.x = random(-width / 2, width / 2); // Neue zufällige x-Position
      this.z = random(-width / 2, width / 2); // Neue zufällige z-Position
    }
  }

  show() {
    push();
    translate(this.x, this.y, this.z); // Position der Sphäre im 3D-Raum
    fill(85, 115, 255, 150); // Halbtransparentes Grün
    sphere(this.size); // Zeichne die Sphäre
    pop();
  }
}