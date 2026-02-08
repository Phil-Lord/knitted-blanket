// https://github.com/pmndrs/cannon-es/blob/c72307cae66757e49b7f8471c16c1e1842789479/examples/threejs_cloth.html

import * as CANNON from 'cannon-es';
import * as THREE from 'https://unpkg.com/three@0.122.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.122.0/examples/jsm/controls/OrbitControls.js';

const clothMass = 1; // 1 kg in total
const clothSize = 1; // 1 meter
const clothParticlesX = 8; // number of horizontal particles in the cloth
const clothParticlesY = 12; // number of vertical particles in the cloth
const mass = (clothMass / clothParticlesX) * clothParticlesY;
const restDistance = clothSize / clothParticlesX;

const sphereSize = 0.1;

// Parametric function
// https://threejs.org/docs/index.html#api/en/geometries/ParametricGeometry
function clothFunction(u, v, target) {
    const x = (u - 0.5) * restDistance * clothParticlesX;
    const y = (v + 0.5) * restDistance * clothParticlesY;
    const z = 0;

    target.set(x, y, z);

    return target;
}

// three.js variables
let camera, scene, renderer;
let controls;
let clothGeometry;
let sphereMesh;

// cannon.js variables
let world;
let sphereBody;
const particles = [];

initCannon();
initThree();
animate();

function initCannon() {
    world = new CANNON.World();
    world.gravity.set(0, -9.81, 0);

    // Max solver iterations: Use more for better force propagation, but keep in mind that it's not very computationally cheap!
    world.solver.iterations = 20;

    // Materials
    const clothMaterial = new CANNON.Material('cloth');
    const sphereMaterial = new CANNON.Material('sphere');
    const cloth_sphere = new CANNON.ContactMaterial(clothMaterial, sphereMaterial, {
        friction: 0,
        restitution: 0,
    });
    // Adjust constraint equation parameters
    // Contact stiffness - use to make softer/harder contacts
    cloth_sphere.contactEquationStiffness = 1e9;
    // Stabilization time in number of timesteps
    cloth_sphere.contactEquationRelaxation = 3;

    // Add contact material to the world
    world.addContactMaterial(cloth_sphere);

    // Create sphere
    // Make it a little bigger than the three.js sphere
    // so the cloth doesn't clip thruogh
    const sphereShape = new CANNON.Sphere(sphereSize * 1.3);
    sphereBody = new CANNON.Body({
        type: CANNON.Body.KINEMATIC,
    });
    sphereBody.addShape(sphereShape);
    world.addBody(sphereBody);

    // Create cannon particles
    for (let i = 0; i < clothParticlesX + 1; i++) {
        particles.push([]);
        for (let j = 0; j < clothParticlesY + 1; j++) {
            const index = j * (clothParticlesX + 1) + i;

            const point = clothFunction(
                i / (clothParticlesX + 1),
                j / (clothParticlesY + 1),
                new THREE.Vector3(),
            );
            const particle = new CANNON.Body({
                // Fix in place the first row
                mass: j === clothParticlesY ? 0 : mass,
            });
            particle.addShape(new CANNON.Particle());
            particle.linearDamping = 0.5;
            particle.position.set(point.x, point.y - clothParticlesY * 0.9 * restDistance, point.z);
            particle.velocity.set(0, 0, -0.1 * (clothParticlesY - j));

            particles[i].push(particle);
            world.addBody(particle);
        }
    }

    // Connect the particles with distance constraints
    function connect(i1, j1, i2, j2) {
        world.addConstraint(
            new CANNON.DistanceConstraint(particles[i1][j1], particles[i2][j2], restDistance),
        );
    }
    for (let i = 0; i < clothParticlesX + 1; i++) {
        for (let j = 0; j < clothParticlesY + 1; j++) {
            if (i < clothParticlesX) connect(i, j, i + 1, j);
            if (j < clothParticlesY) connect(i, j, i, j + 1);
        }
    }
}

function initThree() {
    // Camera
    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.5, 10000);
    camera.position.set(Math.cos(Math.PI / 4) * 3, 0, Math.sin(Math.PI / 4) * 3);

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 500, 10000);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(scene.fog.color);

    renderer.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(renderer.domElement);

    // Orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.dampingFactor = 0.3;
    controls.minDistance = 1;
    controls.maxDistance = 5;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.75);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Cloth material
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Calculate grid cell size
    const cols = 7;
    const rows = 10;
    const cellWidth = size / cols;
    const cellHeight = size / rows;

    // Draw colored squares with 3-color repeating pattern, offset each row by +1
    const bluePalette = ['#f1c495', '#1d511e', '#317684'];
    const brownPalette = ['#f1c495', '#3a7e3c', '#2b1a09'];
    const brownsPalette = ['#916131', '#2b1a09'];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // Repeat 3-color pattern, offset by row
            const colourIndex = (x + y) % 3;
            ctx.fillStyle = bluePalette[colourIndex];
            ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }
    }

    // Draw grid lines on top
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= cols; i++) {
        ctx.moveTo(i * cellWidth, 0);
        ctx.lineTo(i * cellWidth, size);
    }
    for (let i = 0; i <= rows; i++) {
        ctx.moveTo(0, i * cellHeight);
        ctx.lineTo(size, i * cellHeight);
    }
    ctx.stroke();

    // Create Three.js Texture
    const texture = new THREE.CanvasTexture(canvas);

    // const clothTexture = new THREE.TextureLoader().load('dog.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 16;
    texture.encoding = THREE.sRGBEncoding;

    const clothMaterial = new THREE.MeshPhongMaterial({
        map: texture,
        side: THREE.DoubleSide,
    });

    // Cloth geometry
    clothGeometry = new THREE.ParametricGeometry(clothFunction, clothParticlesX, clothParticlesY);

    // Cloth mesh
    const clothMesh = new THREE.Mesh(clothGeometry, clothMaterial);
    scene.add(clothMesh);

    // Sphere
    const sphereGeometry = new THREE.SphereGeometry(sphereSize, 20, 20);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });

    sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphereMesh);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updatePhysics();
    render();
}

function updatePhysics() {
    const timeStep = 1 / 60;
    const time = performance.now() / 1000;

    let lastCallTime;
    if (!lastCallTime) {
        world.step(timeStep);
    } else {
        const dt = time - lastCallTime;
        world.step(timeStep, dt);
    }
    lastCallTime = time;
}

function render() {
    // Make the three.js cloth follow the cannon.js particles
    for (let i = 0; i < clothParticlesX + 1; i++) {
        for (let j = 0; j < clothParticlesY + 1; j++) {
            const index = j * (clothParticlesX + 1) + i;
            clothGeometry.vertices[index].copy(particles[i][j].position);
        }
    }

    clothGeometry.normalsNeedUpdate = true;
    clothGeometry.verticesNeedUpdate = true;

    // Move the ball in a circular motion
    const { time } = world;
    const movementRadius = 0.2;
    sphereBody.position.set(movementRadius * Math.sin(time), 0, movementRadius * Math.cos(time));

    // Make the three.js ball follow the cannon.js one
    // Copying quaternion is not needed since it's a sphere
    sphereMesh.position.copy(sphereBody.position);

    renderer.render(scene, camera);
}
