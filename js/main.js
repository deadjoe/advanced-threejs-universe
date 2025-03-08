// 最简单的三维场景代码 - 2023-03-08版
let scene, camera, renderer;
let cube;

// 极简的初始化函数
function init() {
    try {
        console.log("初始化最简单的场景...");
        
        // 立即移除加载界面
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // 创建场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        
        // 创建相机
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;
        
        // 创建渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        const container = document.getElementById('container');
        if (container) {
            container.innerHTML = ''; // 清空容器
            container.appendChild(renderer.domElement);
        } else {
            document.body.appendChild(renderer.domElement);
        }
        
        // 创建一个简单的立方体
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        // 添加轨道控制器
        if (typeof THREE.OrbitControls !== 'undefined') {
            const controls = new THREE.OrbitControls(camera, renderer.domElement);
        }
        
        // 添加环境光
        const light = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(light);
        
        // 添加点光源
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);
        
        // 添加窗口调整事件
        window.addEventListener('resize', onWindowResize);
        
        // 修改信息面板内容
        const infoPanel = document.getElementById('planet-info');
        if (infoPanel) {
            infoPanel.innerHTML = "这是一个简化的场景，渲染了一个绿色立方体";
        }
        
        console.log("初始化完成，开始动画循环");
        
        // 开始动画循环
        animate();
    } catch (e) {
        console.error("初始化时出错:", e);
        alert("初始化THREE.js场景时出错，请查看控制台");
    }
}

// 简单的动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 旋转立方体
    if (cube) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
    }
    
    // 渲染场景
    renderer.render(scene, camera);
}

// 处理窗口大小改变
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 页面加载完成后初始化
window.addEventListener('load', init);