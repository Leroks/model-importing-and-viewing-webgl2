const vsSource = `#version 300 es
    in vec4 pos;
    uniform mat4 projectionMatrix;
    uniform mat4 mvMatrix;
    uniform vec4 vColor;
    out vec4 fColor;
    
    void main() 
    {
        gl_Position =  projectionMatrix  * mvMatrix * pos;
        fColor = vColor;
    }
`;
const fsSource = `#version 300 es
    precision mediump float;
    uniform vec4 fColor;
    out vec4 fragColor;
    
    void main() 
    {
        fragColor = fColor;
    }
`;


var gl;
var canvas;
var type;
var normalizeIt;
var stride;
var offset = 0;
var program;
var multiplier = 1;
var adder = 0;

let uniformColorLoc;
var modelViewMatrix;

let aspectRatio;

var verticesOfShape = [];
var vertexCount;
var posBuffer;

var theta = [0, 0, 0];

var cameraPos = vec3(0, 4, 10);
var target = vec3(0, 0, 0);

var moveCallback;
var mouseX = 0;
var mouseY = 0;
var isMouse = false;


function _createBufferObject(gl, array) {

    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);

    return buffer;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}


window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
})();

var render = function () {
    const programInfo = {
        uniformLocations: {
            projectionMatrixLoc: gl.getUniformLocation(program, "projectionMatrix"),
            modelMatrixUniform: gl.getUniformLocation(program, "mvMatrix")
        }
    }
    // Compute the projection matrix
    var projectionMatrix = perspective(60, aspectRatio, 0.1, 200);
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrixLoc, false, flatten(projectionMatrix)); // Set the matrix.


// Camera Rotation with mouse
    if (isMouse) {
        theta[1] += mouseX / 100 * multiplier;
        theta[0] -= mouseY / 100 * multiplier;

        // Limit the vertical rotation to avoid flipping
        theta[0] = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, theta[0]));

        target[0] += mouseX / 100 + adder;
        target[1] -= mouseY / 100 + adder;

        isMouse = false;
    }

    modelViewMatrix = lookAt(cameraPos, target, vec3(0, 1, 0));

    modelViewMatrix = mult(modelViewMatrix, rotate(-45, [0, 1, 0]));

    modelViewMatrix = mult(modelViewMatrix, rotate(theta[1], [0, 1, 0]));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[0], [1, 0, 0]));

    gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrixUniform, false, flatten(modelViewMatrix));

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform4f(uniformColorLoc, 0.50, 1.0, 0.50, 1);
    gl.drawArrays(gl.TRIANGLES, offset, vertexCount - offset);

    gl.uniform4f(uniformColorLoc, 0.3, 0.3, 0.3, 1);
    gl.drawArrays(gl.TRIANGLES, 0, offset);


    requestAnimFrame(render);
}

var pointerLockApi = function () {
    return canvas ===
        document.pointerLockElement
}

function init() {

    canvas = document.querySelector("#canvas");
    gl = canvas.getContext("webgl2");

    program = initShaderProgram(gl, vsSource, fsSource);
    gl.useProgram(program);

    var havePointerLock = 'pointerLockElement' in document ||
        'webkitPointerLockElement' in document;


    var lockChange = function () {
        if (!havePointerLock) {
            return;
        }
        if (pointerLockApi()) {
            document.addEventListener("mousemove", moveCallback, false);
        } else {
            document.removeEventListener("mousemove", moveCallback, false);
        }

    }

    document.addEventListener('pointerlockchange', lockChange, false);

    moveCallback = function (e) {
        isMouse = true;
        var movementX = e.movementX ||
            e.webkitMovementX || 0;

        var movementY = e.movementY ||
            e.webkitMovementY || 0;
        mouseX = movementX;
        mouseY = movementY;
    }

    type = gl.FLOAT;
    normalizeIt = false;
    stride = Float32Array.BYTES_PER_ELEMENT * 6;

    aspectRatio = canvas.width / canvas.height;

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL);
    gl.cullFace(gl.BACK);
    gl.cullFace(gl.CCW);

    posBuffer = _createBufferObject(gl, verticesOfShape);

    uniformColorLoc = gl.getUniformLocation(program, "fColor");

    const aPosition = gl.getAttribLocation(program, "pos");
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, type, normalizeIt, stride, 0);


    requestAnimationFrame(function () {
        render();
    });
}

function loadMeshData(string) {
    var lines = string.split("\n");
    var p = [];
    var n = [];

    for (var i = 0; i < lines.length; i++) {
        var numbersOfline = lines[i].trimRight().split(' ');
        if (numbersOfline.length > 0) {

            switch (numbersOfline[0]) {
                case 'v':
                    p.push([+numbersOfline[1], +numbersOfline[2], +numbersOfline[3]]);
                    break;
                case 'vn':
                    n.push([+numbersOfline[1], +numbersOfline[2], +numbersOfline[3]]);
                    break;
                case 'f':
                    var faceVertices = [];
                    for (var j = 1; j < numbersOfline.length; j++) {
                        var indices = numbersOfline[j].split('/');
                        faceVertices.push({
                            position: p[+(indices[0]) - 1],
                            normal: n[+(indices[2]) - 1]
                        });
                    }

                    // Handle quads (four vertices in a face)
                    if (faceVertices.length === 4) {
                        verticesOfShape.extend(faceVertices[0].position);
                        verticesOfShape.extend(faceVertices[0].normal);

                        verticesOfShape.extend(faceVertices[1].position);
                        verticesOfShape.extend(faceVertices[1].normal);

                        verticesOfShape.extend(faceVertices[2].position);
                        verticesOfShape.extend(faceVertices[2].normal);

                        verticesOfShape.extend(faceVertices[0].position);
                        verticesOfShape.extend(faceVertices[0].normal);

                        verticesOfShape.extend(faceVertices[2].position);
                        verticesOfShape.extend(faceVertices[2].normal);

                        verticesOfShape.extend(faceVertices[3].position);
                        verticesOfShape.extend(faceVertices[3].normal);
                    } else { // Handle triangles
                        offset += 3;
                        verticesOfShape.extend(faceVertices[0].position);
                        verticesOfShape.extend(faceVertices[0].normal);

                        verticesOfShape.extend(faceVertices[1].position);
                        verticesOfShape.extend(faceVertices[1].normal);

                        verticesOfShape.extend(faceVertices[2].position);
                        verticesOfShape.extend(faceVertices[2].normal);
                    }
                    break;
                default:
                    break;
            }
        }
    }

    vertexCount = verticesOfShape.length / 6;
    init();
}


Array.prototype.extend = function (other_array) {
    other_array.forEach(function (v) {
        this.push(v)
    }, this);
}

function objLoader(filename) {
    fetch(filename)
        .then(response => {
            if (!response.ok) {
                throw new Error('Fail ' + filename);
            }
            return response.text();
        })
        .then(data => {
            loadMeshData(data);
        })
        .catch(error => {
            alert(error.message);
        });
}

document.onkeydown = function (e) {
    switch (e.key) {
        case "PageDown":
            cameraPos[1] -= 0.25;
            target[1] -= 0.25;
            break;
        case "PageUp":
            cameraPos[1] += 0.25;
            target[1] += 0.25;
            break;
        case "ArrowLeft":
            cameraPos[0] -= 0.15;
            target[0] -= 0.15;
            break;
        case "ArrowRight":
            cameraPos[0] += 0.15;
            target[0] += 0.15;
            break;
        case "ArrowUp":
            cameraPos[2] -= 0.55;
            target[2] -= 0.55;
            break;
        case "ArrowDown":
            cameraPos[2] += 0.55;
            target[2] += 0.55;
            break;
        case "p":
            if (!pointerLockApi()) {
                canvas.requestPointerLock();
            } else {
                document.exitPointerLock();
            }
            break;
        default:
            break;
    }
}

window.onload = function () {
    objLoader('Assets/cat.obj')
    objLoader('Assets/terrain.obj')
}