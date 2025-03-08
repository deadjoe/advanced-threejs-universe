// Three.js 太阳系模拟 - 升级版 2023-03-08
let scene, camera, renderer, controls;
let planets = {};
let clock;

// 初始化函数
function init() {
    try {
        console.log("初始化太阳系场景...");
        
        // 立即移除加载界面
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // 创建时钟对象用于动画
        clock = new THREE.Clock();
        
        // 创建场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        
        // 创建相机
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 30, 90);
        
        // 创建渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        
        const container = document.getElementById('container');
        if (container) {
            container.innerHTML = ''; // 清空容器
            container.appendChild(renderer.domElement);
        } else {
            document.body.appendChild(renderer.domElement);
        }
        
        // 添加轨道控制器
        if (typeof THREE.OrbitControls !== 'undefined') {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 20;
            controls.maxDistance = 300;
        }
        
        // 添加环境光
        const ambientLight = new THREE.AmbientLight(0x333333);
        scene.add(ambientLight);
        
        // 创建太阳系
        createSolarSystem();
        
        // 创建背景星星
        createStars(1000);
        
        // 添加窗口调整事件
        window.addEventListener('resize', onWindowResize);
        
        // 修改信息面板内容
        const infoPanel = document.getElementById('planet-info');
        if (infoPanel) {
            infoPanel.innerHTML = "点击行星查看详情";
        }
        
        console.log("初始化完成，开始动画循环");
        
        // 开始动画循环
        animate();
    } catch (e) {
        console.error("初始化时出错:", e);
        alert("初始化THREE.js场景时出错，请查看控制台");
    }
}

// 创建太阳系
function createSolarSystem() {
    // 太阳
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    planets.sun = sun;
    
    // 添加太阳光源
    const sunLight = new THREE.PointLight(0xffffff, 1.5, 1000);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    
    // 创建行星
    createPlanet('mercury', 0.8, 12, 0, 0x888888);
    createPlanet('venus', 1.2, 16, 0, 0xe39e1c);
    createPlanet('earth', 1.5, 22, 0.1, 0x2233ff);
    createPlanet('mars', 1, 28, 0.05, 0xff3300);
    createPlanet('jupiter', 4, 40, 0.05, 0xd8ca9d);
    createPlanet('saturn', 3.5, 55, 0.1, 0xf0e2a1);
    createPlanet('uranus', 2.5, 70, 0.1, 0xa6fff8);
    createPlanet('neptune', 2.3, 85, 0.1, 0x0000ff);
    
    // 创建行星轨道
    createOrbits();
    
    // 延迟创建土星环和地球卫星，确保行星对象已经创建
    setTimeout(() => {
        if (planets.earth) {
            createMoon(planets.earth, 0.4, 2.2, 0.02, 0xcccccc);
        }
        if (planets.saturn) {
            createSaturnRings(planets.saturn);
        }
    }, 100);
}

// 创建单个行星
function createPlanet(name, size, distance, tilt, color) {
    const planetGeometry = new THREE.SphereGeometry(size, 32, 32);
    const planetMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.8
    });
    
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    
    // 设置行星数据
    planet.userData = {
        name: name,
        distance: distance,
        orbitalSpeed: 0.02 / Math.sqrt(distance), // 根据距离调整速度
        rotationSpeed: 0.01,
        tilt: tilt
    };
    
    // 设置位置和倾斜角度
    planet.position.x = distance;
    planet.rotation.x = tilt;
    
    // 启用阴影
    planet.castShadow = true;
    planet.receiveShadow = true;
    
    scene.add(planet);
    planets[name] = planet;
    
    return planet;
}

// 创建地球卫星（月球）
function createMoon(parent, size, distance, orbitalSpeed, color) {
    const moonGeometry = new THREE.SphereGeometry(size, 16, 16);
    const moonMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.8
    });
    
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // 创建卫星系统（用Group包装便于旋转）
    const moonSystem = new THREE.Group();
    moonSystem.add(moon);
    moon.position.x = distance;
    
    // 设置卫星数据
    moon.userData = {
        name: `${parent.userData.name}-moon`,
        orbitalSpeed: orbitalSpeed,
        rotationSpeed: 0.005
    };
    
    // 启用阴影
    moon.castShadow = true;
    moon.receiveShadow = true;
    
    parent.add(moonSystem);
    return moonSystem;
}

// 创建土星环
function createSaturnRings(saturn) {
    const innerRadius = 4;
    const outerRadius = 7;
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffefd5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    
    saturn.add(ring);
    return ring;
}

// 创建行星轨道
function createOrbits() {
    Object.keys(planets).forEach(name => {
        if (name !== 'sun') {
            const planet = planets[name];
            const orbitGeometry = new THREE.RingGeometry(
                planet.userData.distance - 0.1,
                planet.userData.distance + 0.1,
                128
            );
            
            const orbitMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.1
            });
            
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            scene.add(orbit);
        }
    });
}

// 创建背景星星
function createStars(count) {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1
    });
    
    const starsVertices = [];
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
    
    return starField;
}

// 更新天体位置
function updatePlanets(delta) {
    // 更新行星位置
    Object.keys(planets).forEach(name => {
        if (name !== 'sun') {
            const planet = planets[name];
            
            // 公转
            if (planet.userData.orbitalSpeed) {
                const angle = planet.userData.orbitalSpeed * delta;
                const x = planet.position.x;
                const z = planet.position.z;
                
                planet.position.x = x * Math.cos(angle) - z * Math.sin(angle);
                planet.position.z = x * Math.sin(angle) + z * Math.cos(angle);
            }
            
            // 自转
            if (planet.userData.rotationSpeed) {
                planet.rotation.y += planet.userData.rotationSpeed * delta;
            }
            
            // 更新卫星位置
            planet.children.forEach(child => {
                if (child instanceof THREE.Group) {
                    child.rotation.y += 0.02 * delta;
                }
            });
        }
    });
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    try {
        const delta = clock ? clock.getDelta() * 10 : 0.1;
        
        // 更新控制器
        if (controls) {
            controls.update();
        }
        
        // 更新行星位置
        updatePlanets(delta);
        
        // 渲染场景
        renderer.render(scene, camera);
    } catch (e) {
        console.error("动画循环中出错:", e);
    }
}

// 处理窗口大小改变
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 添加射线投射和点击交互
function initInteractions() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // 鼠标点击事件
    window.addEventListener('click', function(event) {
        // 计算鼠标在归一化设备坐标中的位置 (-1 到 +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // 从相机发射一条射线
        raycaster.setFromCamera(mouse, camera);
        
        // 获取射线和所有行星的交点
        const planetObjects = Object.values(planets);
        const intersects = raycaster.intersectObjects(planetObjects);
        
        if (intersects.length > 0) {
            // 获取第一个交点的对象
            const planetObject = intersects[0].object;
            showPlanetInfo(planetObject);
        }
    });
    
    // 控制面板交互
    setupControls();
}

// 显示行星信息
function showPlanetInfo(planetObject) {
    if (!planetObject || !planetObject.userData || !planetObject.userData.name) {
        return;
    }
    
    const planetName = planetObject.userData.name;
    const infoPanel = document.getElementById('planet-info');
    
    if (!infoPanel) return;
    
    const planetNames = {
        sun: "太阳",
        mercury: "水星",
        venus: "金星",
        earth: "地球",
        mars: "火星",
        jupiter: "木星",
        saturn: "土星",
        uranus: "天王星",
        neptune: "海王星"
    };
    
    const displayName = planetNames[planetName] || planetName;
    
    let html = `<h3>${displayName}</h3>`;
    
    if (planetName === 'sun') {
        html += `<p>太阳系的中心恒星</p>`;
    } else {
        const distance = planetObject.userData.distance;
        const orbitalSpeed = planetObject.userData.orbitalSpeed;
        const rotationSpeed = planetObject.userData.rotationSpeed;
        
        html += `<p>距太阳: ${distance} 单位</p>`;
        html += `<p>公转速度: ${(orbitalSpeed * 1000).toFixed(2)}</p>`;
        html += `<p>自转速度: ${(rotationSpeed * 1000).toFixed(2)}</p>`;
    }
    
    infoPanel.innerHTML = html;
}

// 设置控制面板交互
function setupControls() {
    const autoRotateToggle = document.getElementById('auto-rotate-toggle');
    const resetCamera = document.getElementById('reset-camera');
    
    if (autoRotateToggle) {
        autoRotateToggle.addEventListener('click', function() {
            if (controls) {
                controls.autoRotate = !controls.autoRotate;
                this.textContent = `自动旋转: ${controls.autoRotate ? '开' : '关'}`;
            }
        });
    }
    
    if (resetCamera) {
        resetCamera.addEventListener('click', function() {
            if (camera) {
                camera.position.set(0, 30, 90);
                camera.lookAt(0, 0, 0);
                if (controls) {
                    controls.target.set(0, 0, 0);
                    controls.update();
                }
            }
        });
    }
}

// 初始化交互
window.addEventListener('load', function() {
    init();
    
    // 延迟初始化交互，确保场景已经加载
    setTimeout(initInteractions, 500);
});