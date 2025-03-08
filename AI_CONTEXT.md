# Three.js 太阳系项目 AI 开发指南

此文档专为AI助手设计，提供项目的关键信息、代码结构和设计决策，以便在未来的结对编程中快速理解项目。

## 项目概览

**项目名称**: Three.js 太阳系可视化
**主要功能**: 交互式3D太阳系模拟，包含太阳、行星、卫星、小行星带和宇宙背景
**核心技术**: Three.js, WebGL, JavaScript
**主要文件**: 
- minimal.js (当前使用的主要实现)
- index.html (HTML入口)

## 核心设计决策

1. **场景组织**: 
   - 使用`THREE.Group`作为太阳系容器(`solarSystemGroup`)
   - 所有天体添加到这个Group而非直接添加到scene
   - 通过调整Group的Y轴位置(`solarSystemGroup.position.y`)整体移动太阳系

2. **视角策略**:
   - 相机位置: (0, 30, 60) - 提供俯视视角
   - 相机目标点: (0, 20, 0) - 指向太阳系中心上方
   - 通过调整目标点和Group位置确保太阳系在屏幕中央

3. **行星运动**:
   - 公转: 基于时间和距离计算位置，模拟开普勒定律
   - 自转: 使用累积旋转值避免位置更新时重置旋转
   - 轨道倾斜: 通过三角函数计算实现

4. **性能优化**:
   - 使用适当的多边形数量
   - 对小行星使用简单几何体
   - 保存高度等状态避免重复计算

## 代码结构与关键组件

### 全局变量

```javascript
let scene, camera, renderer, controls;
let sun;
let planets = {};
let solarSystemGroup; // 太阳系容器组
```

### 初始化流程

初始化函数(`init()`)执行以下关键步骤:
1. 创建场景、相机和渲染器
2. 创建并配置轨道控制器
3. 创建太阳系Group容器并设置位置
4. 创建太阳、行星和其他天体
5. 设置光照
6. 添加事件监听器
7. 开始动画循环

### 天体创建函数

1. **行星创建**:
```javascript
function createPlanet(name, size, distance, color, tilt = 0) {
    // 创建几何体和材质
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshLambertMaterial({
        color: color,
        emissive: new THREE.Color(color).multiplyScalar(0.1)
    });
    
    // 创建网格并设置位置
    const planet = new THREE.Mesh(geometry, material);
    planet.position.x = distance;
    
    // 设置元数据
    planet.userData = {
        name: name,
        distance: distance,
        orbitalSpeed: 0.005 / Math.sqrt(distance / 10),
        rotationSpeed: 0.01 * (1 + size / 2),
        tilt: tilt
    };
    
    // 添加到太阳系组
    solarSystemGroup.add(planet);
    planets[name] = planet;
    
    return planet;
}
```

2. **特殊天体**:
   - `createSunGlow()`: 创建太阳光晕
   - `createSaturnRings()`: 创建土星环
   - `createMoon()`: 创建地球的月球
   - `createAsteroidBelt()`: 创建火星和木星之间的小行星带

### 动画与更新

主要动画循环在`animate()`函数中:
```javascript
function animate() {
    requestAnimationFrame(animate);
    
    // 更新控制器
    if (controls) controls.update();
    
    // 更新太阳旋转
    updateSun();
    
    // 更新行星位置和旋转
    const now = Date.now() * 0.001;
    updatePlanets(now);
    
    // 更新小行星
    updateAsteroids();
    
    // 渲染场景
    renderer.render(scene, camera);
}
```

### 关键更新函数

1. **行星更新**:
```javascript
// 更新行星位置和旋转
Object.keys(planets).forEach(name => {
    const planet = planets[name];
    const distance = planet.userData.distance;
    const speed = planet.userData.orbitalSpeed;
    const tilt = planet.userData.tilt;
    
    // 公转 - 计算轨道位置
    const angle = now * speed;
    planet.position.x = distance * Math.cos(angle);
    planet.position.y = distance * Math.sin(angle) * Math.sin(tilt);
    planet.position.z = distance * Math.sin(angle) * Math.cos(tilt);
    
    // 自转 - 累积旋转角度
    if (planet.userData.currentRotation === undefined) {
        planet.userData.currentRotation = 0;
    }
    planet.userData.currentRotation += planet.userData.rotationSpeed * 0.1;
    planet.rotation.y = planet.userData.currentRotation;
});
```

2. **小行星更新**:
```javascript
// 更新小行星位置
scene.children.forEach(object => {
    if (object.userData && object.userData.orbitRadius !== undefined) {
        // 更新自转
        object.rotation.x += object.userData.rotationSpeed;
        object.rotation.y += object.userData.rotationSpeed;
        
        // 更新公转
        object.userData.orbitAngle += object.userData.orbitSpeed;
        const angle = object.userData.orbitAngle;
        const radius = object.userData.orbitRadius;
        
        // 计算新位置
        object.position.x = radius * Math.cos(angle);
        
        // 使用保存的高度值
        if (object.userData.height === undefined) {
            object.userData.height = (Math.random() - 0.5) * 2;
        }
        object.position.y = object.userData.height;
        object.position.z = radius * Math.sin(angle);
    }
});
```

## 交互功能

1. **相机控制**:
   - 使用OrbitControls实现拖拽旋转和缩放
   - 可通过重置相机按钮恢复默认视角

2. **行星信息**:
   - 点击行星显示详细信息
   - 使用Raycaster检测点击的天体

```javascript
// 射线投射逻辑
raycaster.setFromCamera(mouse, camera);
const intersects = raycaster.intersectObjects(scene.children, true);
if (intersects.length > 0) {
    const object = intersects[0].object;
    // 显示天体信息...
}
```

## 控制面板功能

HTML页面提供了多个控制选项：
- 时间速度调整
- 星星数量控制
- 光照强度调整
- 轨道可见性控制
- 自动旋转控制
- 重置相机
- 预设场景切换

## 关键优化点

1. **Group容器模式**:
   - 使用solarSystemGroup容器统一管理和移动太阳系
   - 可通过`solarSystemGroup.position.y`调整整个太阳系位置
   - 优点：结构清晰，易于调整和维护

2. **行星自转优化**:
   - 使用`userData.currentRotation`累积旋转值
   - 避免位置更新时重置旋转角度
   - 行星自转速度与大小成正比

3. **小行星优化**:
   - 使用简单几何体减少多边形数
   - 保存高度值避免每帧随机生成
   - 随机分布在指定轨道区域

## 常见问题与解决方案

1. **问题**: 行星不旋转或旋转不正常
   **解决**: 确保使用累积旋转值并正确应用到rotation.y

2. **问题**: 太阳系位置在屏幕中不居中
   **解决**: 调整solarSystemGroup.position.y的值（当前为25）

3. **问题**: 相机视角不理想
   **解决**: 同时调整相机位置和目标点
   ```javascript
   camera.position.set(0, 30, 60);
   controls.target.set(0, 20, 0);
   ```

## 扩展建议

1. **新行星添加**:
```javascript
createPlanet('newPlanet', size, distance, color, tilt);
createOrbit(distance, tilt, orbitColor);
```

2. **视觉效果增强**:
   - 添加行星纹理: 使用TextureLoader加载图片
   - 改进光照: 添加额外的光源或阴影
   - 增加粒子效果: 如彗星尾、行星环等

3. **交互性增强**:
   - 添加天体信息卡片
   - 实现镜头动画过渡
   - 添加时间控制功能

## 代码约定

1. **命名规范**:
   - 变量和函数使用驼峰命名法(camelCase)
   - 常量使用大写加下划线(UPPER_SNAKE_CASE)

2. **代码组织**:
   - 初始化代码在init()函数中
   - 创建函数以create前缀命名
   - 更新函数以update前缀命名
   
3. **性能考虑**:
   - 使用BufferGeometry而非Geometry
   - 尽可能减少透明物体数量
   - 根据需要调整几何体细节级别

---

*此文档设计用于AI辅助开发，提供项目的核心概念、代码结构和设计决策。*
*最后更新: 2025-03-09*