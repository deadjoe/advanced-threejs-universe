/**
 * 用户交互管理
 */
class InteractionManager {
    constructor(camera, scene, renderer, controls) {
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        this.controls = controls;
        
        // 射线投射
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // 悬停和选中的对象
        this.hoveredObject = null;
        this.selectedObject = null;
        
        // 悬停状态标记
        this.isHovering = false;
        
        // 绑定事件处理
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseClick = this.onMouseClick.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        
        // 初始化事件监听
        this.initEventListeners();
    }
    
    // 初始化事件监听
    initEventListeners() {
        // 鼠标事件
        document.addEventListener('mousemove', this.onMouseMove, false);
        document.addEventListener('click', this.onMouseClick, false);
        
        // 触摸事件（移动设备）
        document.addEventListener('touchstart', this.onTouchStart, false);
        
        // 窗口大小改变
        window.addEventListener('resize', this.onWindowResize, false);
    }
    
    // 鼠标移动事件
    onMouseMove(event) {
        // 计算鼠标在归一化设备坐标中的位置
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.checkIntersection();
    }
    
    // 鼠标点击事件
    onMouseClick(event) {
        // 更新鼠标位置（以防未触发 mousemove）
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // 处理点击
        this.handleClick();
    }
    
    // 触摸事件（移动设备）
    onTouchStart(event) {
        if (event.touches.length > 0) {
            // 阻止默认行为，防止滚动
            event.preventDefault();
            
            // 获取第一个触摸点
            const touch = event.touches[0];
            
            // 更新鼠标位置
            this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            
            // 处理点击
            this.handleClick();
        }
    }
    
    // 窗口大小改变事件
    onWindowResize() {
        // 更新相机
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // 更新渲染器
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // 检查射线与对象交集
    checkIntersection() {
        // 使用射线投射器检测相交对象
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 获取所有可交互的对象
        const interactableObjects = [];
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh && object.userData && object.userData.name) {
                interactableObjects.push(object);
            }
        });
        
        // 计算相交
        const intersects = this.raycaster.intersectObjects(interactableObjects);
        
        // 处理悬停
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            // 如果悬停对象改变
            if (this.hoveredObject !== object) {
                // 恢复之前悬停对象的外观（如果有）
                if (this.hoveredObject) {
                    this.onObjectLeave(this.hoveredObject);
                }
                
                // 设置新的悬停对象
                this.hoveredObject = object;
                this.onObjectHover(object);
                
                // 设置悬停状态
                this.isHovering = true;
                
                // 更新鼠标样式
                document.body.style.cursor = 'pointer';
            }
        } else if (this.isHovering) {
            // 如果之前有悬停对象，但现在没有
            if (this.hoveredObject) {
                this.onObjectLeave(this.hoveredObject);
            }
            
            // 重置悬停状态
            this.hoveredObject = null;
            this.isHovering = false;
            
            // 恢复鼠标样式
            document.body.style.cursor = 'auto';
        }
    }
    
    // 处理点击
    handleClick() {
        // 使用射线投射器检测相交对象
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 获取所有可交互的对象
        const interactableObjects = [];
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh && object.userData && object.userData.name) {
                interactableObjects.push(object);
            }
        });
        
        // 计算相交
        const intersects = this.raycaster.intersectObjects(interactableObjects);
        
        // 处理点击
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            // 如果点击了新对象
            if (this.selectedObject !== object) {
                // 恢复之前选中对象的外观（如果有）
                if (this.selectedObject) {
                    this.onObjectUnselect(this.selectedObject);
                }
                
                // 设置新的选中对象
                this.selectedObject = object;
                this.onObjectSelect(object);
            }
        } else {
            // 如果点击了空白区域，取消选择
            if (this.selectedObject) {
                this.onObjectUnselect(this.selectedObject);
                this.selectedObject = null;
            }
        }
    }
    
    // 当鼠标悬停在对象上时
    onObjectHover(object) {
        // 只在对象未被选中时应用悬停效果
        if (object !== this.selectedObject) {
            if (object.material.emissive) {
                // 对于有自发光属性的材质，增加发光强度
                object.userData._originalEmissive = object.material.emissive.clone();
                object.material.emissive.set(0x555555);
            } else if (object.material.color) {
                // 对于普通材质，缓存并调亮颜色
                object.userData._originalColor = object.material.color.clone();
                object.material.color.lerp(new THREE.Color(0xffffff), 0.2);
            }
        }
        
        // 显示对象提示信息（如果有）
        if (object.userData.name) {
            this.showTooltip(object);
        }
    }
    
    // 当鼠标离开对象时
    onObjectLeave(object) {
        // 恢复原始外观
        if (object.userData._originalEmissive) {
            object.material.emissive.copy(object.userData._originalEmissive);
            delete object.userData._originalEmissive;
        } else if (object.userData._originalColor) {
            object.material.color.copy(object.userData._originalColor);
            delete object.userData._originalColor;
        }
        
        // 隐藏提示信息
        this.hideTooltip();
    }
    
    // 当对象被选中时
    onObjectSelect(object) {
        // 应用选中效果（比悬停效果更强）
        if (object.material.emissive) {
            object.userData._originalEmissive = object.material.emissive.clone();
            object.material.emissive.set(0x777777);
        }
        
        // 显示详细信息
        if (object.userData.name) {
            this.showObjectInfo(object);
        }
        
        // 特殊效果：聚焦相机到选中对象
        this.focusCameraOnObject(object);
    }
    
    // 当对象被取消选中时
    onObjectUnselect(object) {
        // 恢复原始外观
        if (object.userData._originalEmissive) {
            object.material.emissive.copy(object.userData._originalEmissive);
            delete object.userData._originalEmissive;
        }
        
        // 清除详细信息
        document.getElementById('planet-info').innerHTML = "点击天体查看详情";
    }
    
    // 显示对象提示信息（简单版）
    showTooltip(object) {
        // 可以根据需要实现自定义提示框
        // 这里使用简单的方法更新信息面板
        const celestialNames = {
            sun: "太阳",
            mercury: "水星",
            venus: "金星",
            earth: "地球",
            mars: "火星",
            jupiter: "木星",
            saturn: "土星",
            uranus: "天王星",
            neptune: "海王星",
            blackhole: "黑洞"
        };
        
        const name = object.userData.name;
        const displayName = celestialNames[name] || name;
        
        const panel = document.getElementById('planet-info');
        panel.innerHTML = `<h3>${displayName}</h3><p>点击查看详情...</p>`;
    }
    
    // 隐藏提示信息
    hideTooltip() {
        // 如果没有选中对象，则清空信息面板
        if (!this.selectedObject) {
            document.getElementById('planet-info').innerHTML = "点击天体查看详情";
        }
    }
    
    // 显示对象详细信息
    showObjectInfo(object) {
        // 使用天体数据模块显示详细信息
        if (typeof updateInfoPanel === 'function') {
            updateInfoPanel(object.userData.name);
        } else {
            // 备用显示方法
            let info = `<h3>${object.userData.name}</h3>`;
            
            if (object.userData.distance) {
                info += `<p>距离太阳: ${object.userData.distance} 百万公里</p>`;
            }
            
            if (object.userData.orbitalSpeed) {
                info += `<p>公转速度: ${(object.userData.orbitalSpeed * 1000).toFixed(2)}</p>`;
            }
            
            if (object.userData.rotationSpeed) {
                info += `<p>自转速度: ${(object.userData.rotationSpeed * 1000).toFixed(2)}</p>`;
            }
            
            document.getElementById('planet-info').innerHTML = info;
        }
    }
    
    // 聚焦相机到选中对象
    focusCameraOnObject(object) {
        // 计算新的相机位置
        const objectPosition = new THREE.Vector3();
        object.getWorldPosition(objectPosition);
        
        // 调整观察距离
        const size = object.geometry.boundingSphere ? object.geometry.boundingSphere.radius : 1;
        const distance = size * 5; // 调整倍数以适应不同大小的对象
        
        // 设置新的相机目标
        this.controls.target.copy(objectPosition);
        
        // 如果启用了动画过渡，使用补间动画平滑过渡
        if (window.TWEEN) {
            // 保存当前相机位置
            const startPosition = this.camera.position.clone();
            
            // 计算新的相机位置，保持相机到目标的方向不变
            const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
            const endPosition = objectPosition.clone().add(direction.multiplyScalar(distance));
            
            // 创建补间动画
            new TWEEN.Tween(startPosition)
                .to(endPosition, 1000) // 1000毫秒过渡
                .easing(TWEEN.Easing.Cubic.InOut)
                .onUpdate(() => {
                    this.camera.position.copy(startPosition);
                })
                .start();
        } else {
            // 如果没有补间动画库，则直接设置相机位置
            const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
            this.camera.position.copy(objectPosition.clone().add(direction.multiplyScalar(distance)));
        }
    }
    
    // 移除事件监听
    removeEventListeners() {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('click', this.onMouseClick);
        document.removeEventListener('touchstart', this.onTouchStart);
        window.removeEventListener('resize', this.onWindowResize);
    }
    
    // 销毁管理器
    destroy() {
        this.removeEventListeners();
        this.hoveredObject = null;
        this.selectedObject = null;
    }
}