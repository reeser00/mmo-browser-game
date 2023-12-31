import * as THREE from '/js/three/three.module.js';
import { GLTFLoader } from '/js/three/GLTFLoader.js';
import { FBXLoader } from '/js/three/FBXLoader.js';
import { OrbitControls } from '/js/three/OrbitControls.js';

class CharacterControllerProxy {
    constructor(animations) {
        this._animations = animations;
    }

    get animations() {
        return this._animations;
    }
};

class CharacterController {
    constructor(params){
        this._Init(params);
    }

    _Init(params){
        this._params = params;
        this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
        this._velocity = new THREE.Vector3(0, 0, 0);

        this._animations = {};
        this._input = new CharacterControllerInput();
        this._stateMachine = new CharacterFSM(new CharacterControllerProxy(this._animations));

        this._LoadModels();
    }

    _LoadModels(){
        const loader = new FBXLoader();
        loader.setPath('./models/fbx/');
        loader.load('Y Bot.fbx', (fbx) => {
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                c.castShadow = true;
            });

            this._target = fbx;
            this._params.scene.add(this._target);

            this._mixer = new THREE.AnimationMixer(this._target);

            this._manager = new THREE.LoadingManager();
            this._manager.onLoad = () => {
                this._stateMachine.SetState('idle');
            };

            const _OnLoad = (animName, anim) => {
                const clip = anim.animations[0];
                const action = this._mixer.clipAction(clip);

                this._animations[animName] = {
                    clip: clip,
                    action: action,
                };
            };

            const loader = new FBXLoader(this._manager);
            loader.setPath('./models/fbx/');
            loader.load('walk.fbx', (a) => { _OnLoad('walk', a); });
            loader.load('run.fbx', (a) => { _OnLoad('run', a); });
            loader.load('idle.fbx', (a) => { _OnLoad('idle', a); });
        });
    
    }

    Update(timeInSeconds){
        if (!this._target){
            return;
        }

        this._stateMachine.Update(timeInSeconds, this._input);

        const velocity = this._velocity;
        const frameDecceleration = new THREE.Vector3(
            velocity.x * this._decceleration.x,
            velocity.y * this._decceleration.y,
            velocity.z * this._decceleration.z
        );
        frameDecceleration.multiplyScalar(timeInSeconds);
        frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

        velocity.add(frameDecceleration);

        const controlObject = this._target;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();

        const acc = this._acceleration.clone();
        if (this._input._keys.shift){
            acc.multiplyScalar(2.0);
        }

        if (this._input._keys.forward){
            velocity.z += acc.z * timeInSeconds;
        }

        if (this._input._keys.backward){
            velocity.z -= acc.z * timeInSeconds;
        }

        if (this._input._keys.left){
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }

        if (this._input._keys.right){
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }

        controlObject.quaternion.copy(_R);

        const oldPosition = new THREE.Vector3();
        oldPosition.copy(controlObject.position);

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();

        const sideways = new THREE.Vector3(1, 0, 0);
        sideways.applyQuaternion(controlObject.quaternion);
        sideways.normalize();

        sideways.multiplyScalar(velocity.x * timeInSeconds);
        forward.multiplyScalar(velocity.z * timeInSeconds);

        controlObject.position.add(forward);
        controlObject.position.add(sideways);

        oldPosition.copy(controlObject.position);

        if (this._mixer){
            this._mixer.update(timeInSeconds);
        }
    }
};

class CharacterControllerInput {
    constructor(){
        this._Init();
    }

    _Init(){
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false,
            shift: false,
        };
        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
    }

    _onKeyDown(event){
        switch(event.keyCode) {
            case 87: //W
                this._keys.forward = true;
                break;
            case 65: //A
                this._keys.left = true;
                break;
            case 83: //S
                this._keys.backward = true;
                break;
            case 68: //D
                this._keys.right = true;
                break;
            case 32: //SPACE
                this._keys.space = true;
                break;
            case 16: //SHIFT
                this._keys.shift = true;
                break;
        }
    }

    _onKeyUp(event){
        switch(event.keyCode) {
            case 87: //W
                this._keys.forward = false;
                break;
            case 65: //A
                this._keys.left = false;
                break;
            case 83: //S
                this._keys.backward = false;
                break;
            case 68: //D
                this._keys.right = false;
                break;
            case 32: //SPACE
                this._keys.space = false;
                break;
            case 16: //SHIFT
                this._keys.shift = false;
                break;
        }
    }
};

class FiniteStateMachine {
    constructor(){
        this._states = {};
        this._currentState = null;
    }

    _AddState(name, type){
        this._states[name] = type;
    }

    SetState(name){
        const prevState = this._currentState;

        if (prevState){
            if (prevState.Name == name){
                return;
            }
            prevState.Exit();
        }
        const state = new this._states[name](this);

        this._currentState = state;
        state.Enter(prevState);
    }

    Update(timeElapsed, input){
        if (this._currentState){
            this._currentState.Update(timeElapsed, input);
        }
    }
};

class CharacterFSM extends FiniteStateMachine {
    constructor(proxy){
        super();
        this._proxy = proxy;
        this._Init();
    }

    _Init(){
        this._AddState('idle', IdleState);
        this._AddState('walk', WalkState);
        this._AddState('run', RunState);
    }
};

class State {
    constructor(parent) {
        this._parent = parent;
    }

    Enter() {}
    Exit() {}
    Update() {}
};

class IdleState extends State {
    constructor(parent){
        super(parent);
    }

    get Name(){
        return 'idle';
    }

    Enter(prevState){
        const idleAction = this._parent._proxy._animations['idle'].action;
        if (prevState){
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            idleAction.time = 0.0;
            idleAction.enabled = true;
            idleAction.setEffectiveTimeScale(1.0);
            idleAction.setEffectiveWeight(1.0);
            idleAction.crossFadeFrom(prevAction, 0.5, true);
            idleAction.play();
        } else {
            idleAction.play();
        }
    }

    Exit(){
    }

    Update(_, input){
        if (input._keys.forward || input._keys.backward){
            this._parent.SetState('walk');
        }
    }
}

class WalkState extends State {
    constructor(parent){
        super(parent);
    }

    get Name(){
        return 'walk';
    }

    Enter(prevState){
        const currentAction = this._parent._proxy._animations['walk'].action;
        if (prevState){
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            currentAction.enabled = true;

            if (prevState.Name == 'run'){
                const ratio = currentAction.getClip().duration / prevAction.getClip().duration;
                currentAction.time = prevAction.time * ratio;
            } else {
                currentAction.time = 0.0;
                currentAction.setEffectiveTimeScale(1.0);
                currentAction.setEffectiveWeight(1.0);
            }

            currentAction.crossFadeFrom(prevAction, 0.5, true);
            currentAction.play();
        } else {
            currentAction.play();
        }
    }

    Exit(){
    }

    Update(timeElapsed, input){
        if (input._keys.forward || input._keys.backward){
            if (input._keys.shift){
                this._parent.SetState('run');
            }
            return;
        }

        this._parent.SetState('idle');
    }
}

class RunState extends State {
    constructor(parent){
        super(parent);
    }

    get Name(){
        return 'run';
    }

    Enter(prevState){
        const currentAction = this._parent._proxy._animations['run'].action;
        if (prevState){
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            currentAction.enabled = true;

            if (prevState.Name == 'walk'){
                const ratio = currentAction.getClip().duration / prevAction.getClip().duration;
                currentAction.time = prevAction.time * ratio;
            } else {
                currentAction.time = 0.0;
                currentAction.setEffectiveTimeScale(1.0);
                currentAction.setEffectiveWeight(1.0);
            }

            currentAction.crossFadeFrom(prevAction, 0.5, true);
            currentAction.play();
        } else {
            currentAction.play();
        }
    }

    Exit(){
    }

    Update(timeElapsed, input){
        if (input._keys.forward || input._keys.backward){
            if (!input._keys.shift){
                this._parent.SetState('walk');
            }
            return;
        }

        this._parent.SetState('idle');
    }
}


class MainWorld{
    constructor(){
        this._Initialize();
    }

    _Initialize(){
        this._threejs = new THREE.WebGLRenderer({ antialias: true });
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        //CAMERA
        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(75, 20, 0);

        //SCENE
        this._scene = new THREE.Scene();

        //DIRECTIONAL LIGHT
        let light = new THREE.DirectionalLight(0xFFFFFF);
        light.position.set(100, 100, 100);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.01;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 1.0;
        light.shadow.camera.far = 500;
        light.shadow.camera.left = 200;
        light.shadow.camera.right = -200;
        light.shadow.camera.top = 200;
        light.shadow.camera.bottom = -200;
        this._scene.add(light);

        //AMBIENT LIGHT
        light = new THREE.AmbientLight(0x404040);
        this._scene.add(light);

        //ORBIT CONTROLS
        const controls = new OrbitControls(this._camera, this._threejs.domElement);
        controls.target.set(0, 0, 0);
        controls.update();

        //BOILER [PLEASE REMOVE]
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100, 10, 10),
            new THREE.MeshStandardMaterial({
                color: 0x808080,
            }));
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._scene.add(plane);
        //BOILER END

        this._mixers = [];
        this._previousRAF = null;

        this._LoadAnimatedModel();
        this._RAF();
    }

    _LoadModel(){
        const loader = new GLTFLoader();
        loader.load('./models/skeleton.glb', (gltf) => {
            gltf.scene.traverse(c => {
                c.castShadow = true;
            });
            this._scene.add(gltf.scene);
        });
    }

    _LoadAnimatedModel(){
        const params = {
            camera: this._camera,
            scene: this._scene,
        };
        this._controls = new CharacterController(params);
    }

    _LoadAnimatedModelAndPlay(path, modelFile, animFile, offset) {
        const loader = new FBXLoader();
        loader.setPath(path);
        loader.load(modelFile, (fbx) => {
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                c.castShadow = true;
            });
            fbx.position.copy(offset);

            const anim = new FBXLoader();
            anim.setPath(path);
            anim.load(animFile, (anim) => {
                const m = new THREE.AnimationMixer(fbx);
                this._mixers.push(m);
                const idle = m.clipAction(anim.animations[0]);
                idle.play();
            });
            this._scene.add(fbx);
        });
    }

    _OnWindowResize(){
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF(){
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }

            this._RAF();

            this._threejs.render(this._scene, this._camera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;
        });
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (this._mixers) {
            this._mixers.map(m => m.update(timeElapsedS));
        }

        if (this._controls) {
            this._controls.Update(timeElapsedS);
        }
    }
};

export{
    MainWorld,
    CharacterControllerProxy,
    CharacterController,
    CharacterControllerInput,
    FiniteStateMachine,
    CharacterFSM,
    State,
    IdleState,
    WalkState,
    RunState,
};