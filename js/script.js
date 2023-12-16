const vsSource = `#version 300 es
    in vec4 pos;  // position of the vertex in coordinate system
    uniform mat4 pMatrix, vmMatrix;
    uniform vec4 vColor;
    out vec4 fColor;
    
    void main() 
    {
        gl_Position =  pMatrix  * vmMatrix * pos;
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
var normalize1;
var stride;
var offset = 0;
var program;

let colorF;  //for uniform location
var modelViewMatrix;

let aspectRatio; //canvas.width/canvas.height

var verticesOfShape = []; //vertices of object
var vertexCount;      // verticesOfShape.length /6
var posBuffer;

var theta = [0, 0, 0];

var cameraPos = vec3(0, 4, 10); //use them for lookAt function
var target = vec3(0, 0, 0);

var moveCallback; //for the pointer lock api
var x = 0.00; //mouse movement of x
var y = 0.00; //mouse movement of y
var isM = false;


function _createBufferObject(gl, array) {

    const buffer = gl.createBuffer(); // Create a buffer object

    if (!buffer) {
        out.displayError('Failed to create the buffer object for ' + model.name);
        return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); //Make the buffer object the active buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);// Upload the data for this buffer object

    return buffer;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type); //a new shader is created

    gl.shaderSource(shader, source); //send the source to the shader object
    gl.compileShader(shader); //compile the shader

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {  //If that's false, we know the shader failed to compile
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) { //initialize the shader program
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram(); //Create shader program
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { //If that's false,alert it
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}


window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
            return window.setTimeout(callback, 1000 / 60);
        };
})();

var render = function () {

    // look up uniform locations.
    const programInfo = {
        uniformLocations: {
            projectionMatrixLoc: gl.getUniformLocation(program, "pMatrix"),
            modelMatrixUniform: gl.getUniformLocation(program, "vmMatrix")
        }
    }
    // Compute the projection matrix
    var projectionMatrix = perspective(60, aspectRatio, 0.1, 200);
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrixLoc, false, flatten(projectionMatrix)); // Set the matrix.


    //Camera Rotation
    if (isM) { //for mouse movement
        theta[0] += y / 100;
        theta[1] += x / 100;

        target[0] += x / 100;
        target[1] += y / 100;

        isM = false;
    }

    modelViewMatrix = lookAt(cameraPos, target, vec3(0, 1, 0));  // Compute the camera's matrix using look at.

    modelViewMatrix = mult(modelViewMatrix, rotate(-45, [0, 1, 0]));

    modelViewMatrix = mult(modelViewMatrix, rotate(theta[1], [0, 1, 0]));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[0], [1, 0, 0]));

    gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrixUniform, false, flatten(modelViewMatrix));  // Set the modelViewMatrix.

    gl.clearColor(1.0, 1.0, 1.0, 1.0); //color the background
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform4f(colorF, 0.3, 0.3, 0.3, 1);
    gl.drawArrays(gl.TRIANGLES, 0, offset); //draw

    gl.uniform4f(colorF, 0.4, 1.0, 0.4, 1);
    gl.drawArrays(gl.TRIANGLES, offset, vertexCount - offset); //draw


    requestAnimFrame(render);
}

var pointerLockApi = function () {
    return canvas ===
        document.pointerLockElement ||
        canvas ===
        document.mozPointerLockElement;
}

function init() {

    canvas = document.querySelector("#glcanvas");//canvas element
    gl = canvas.getContext("webgl2");

    // If we don't have a GL context, give up now

    if (!gl) {
        alert("WebGL 2.0 is not available."); //if it fail,alert it
        return;
    }

    program = initShaderProgram(gl, vsSource, fsSource); // Initialize a shader program
    gl.useProgram(program);            //tell webgl use program when drawing it

    var havePointerLock = 'pointerLockElement' in document ||
        'mozPointerLockElement' in document ||
        'webkitPointerLockElement' in document;

    // element for pointerLock
    // prefixes
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;


    var lockChange = function () {
        if (!havePointerLock) {
            return;
        }
        if (pointerLockApi()) { // Pointer was just locked
            document.addEventListener("mousemove", moveCallback, false); // Enable the mousemove
        } else {  //remove the callback
            document.removeEventListener("mousemove", moveCallback, false); // Disable the mousemove listener
        }

    }

    // pointer lock api event listeners
    // Hook pointer lock state change events for different browsers
    document.addEventListener('pointerlockchange', lockChange, false);
    document.addEventListener('mozpointerlockchange', lockChange, false);


    moveCallback = function (e) {
        /*use the movementx and movementy properties
        * to determine the
        * relative mouse movement.
        */
        isM = true;
        var movementX = e.movementX ||
            e.mozMovementX ||
            e.webkitMovementX || 0;

        var movementY = e.movementY ||
            e.mozMovementY ||
            e.webkitMovementY || 0;
        x = movementX;
        y = movementY;
    }

    type = gl.FLOAT;
    normalize1 = false;
    stride = Float32Array.BYTES_PER_ELEMENT * 6;

    aspectRatio = canvas.width / canvas.height;

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST);// Enable depth testing
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.cullFace(gl.BACK);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);// Clear the canvas before we start drawing on it.


    posBuffer = _createBufferObject(gl, verticesOfShape); //for positions

    colorF = gl.getUniformLocation(program, "fColor"); //color

    const aPosition = gl.getAttribLocation(program, "pos");  // Get the location of the shader variables
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);      // Bind the position buffer.
    gl.enableVertexAttribArray(aPosition); // Enable the assignment to aPosition variable
    gl.vertexAttribPointer(aPosition, 3, type, normalize1, stride, 0); // Enable the assignment to aPosition variable


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
                        verticesOfShape.extend(faceVertices[0].position);
                        verticesOfShape.extend(faceVertices[0].normal);

                        verticesOfShape.extend(faceVertices[1].position);
                        verticesOfShape.extend(faceVertices[1].normal);

                        verticesOfShape.extend(faceVertices[2].position);
                        verticesOfShape.extend(faceVertices[2].normal);
                        offset += 3;
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
        case "PageDown":  //Use ‘PageDown’ key to downward with change camera pos
            cameraPos[1] -= 0.2;
            target[1] -= 0.2;
            break;
        case "PageUp":  //Use ‘PageUp’ key to upward
            cameraPos[1] += 0.2; //with change camera pos
            target[1] += 0.2;
            break;
        case "ArrowLeft"://Use ‘ArrowLeft’ key to moves to the left with change camera pos
            cameraPos[0] -= 0.14;
            target[0] -= 0.14;
            break;
        case "ArrowRight": //Use ‘ArrowRight’ key to moves to the right
            cameraPos[0] += 0.14;
            target[0] += 0.14;
            break;
        case "ArrowUp":  //Use ‘ArrowUp’ key to moves to the forward with change camera pos
            cameraPos[2] -= 0.5;
            target[2] -= 0.5;
            break;
        case "ArrowDown": //Use ‘ArrowDown’ key to moves to the backward
            cameraPos[2] += 0.5;
            target[2] += 0.5;
            break;
        case "p": //Use ‘p’ key to activate and deactivate the pointer lock api
            if (!pointerLockApi()) {
                canvas.requestPointerLock(); // Ask the browser to lock the pointer
            } else {   //exit
                document.exitPointerLock();
            }
            break;
        default:
            break;
    }
}

window.onload = function () {  // load a resource
    objLoader('Assets/cat.obj')
    objLoader('Assets/terrain.obj')
}
