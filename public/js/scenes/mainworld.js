import * as THREE from '/js/three/three.module.js';
import { OrbitControls } from '/js/three/OrbitControls.js';
import * as WORLDS from '/js/classes/worlds.js';


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new WORLDS.MainWorld();
});