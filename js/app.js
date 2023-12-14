"use strict";

var gl;
var canvas;
var type;
var normalize1;
var stride;
var offset;
var program;

let colorF;  //for uniform location
var modelViewMatrix;

let aspectRatio; //canvas.width/canvas.height

var verticesOfShape = []; //vertices of object
var vertexCount;      // verticesOfShape.length /6
var posBuffer;

var theta = [0, 0, 0];
var speed = 0; //speed of rotation

var cameraPos = vec3(0, 4, 10); //use them for lookAt function
var target = vec3(0, 0, 0);

var moveCallback; //for the pointer lock api
var x = 0.00; //mouse movement of x
var y = 0.00; //mouse movement of y
var isM = false;


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

    theta[1] += speed;

    if (isM) { //for mouse movement
        theta[0] += 0.01 * y;  //change y pos
        theta[0] += 0.01 * y;
        theta[1] += 0.01 * x; //change x pos
        theta[1] += 0.01 * x;
        isM = false;
    }

    modelViewMatrix = lookAt(cameraPos, target, vec3(0, 1, 0));  // Compute the camera's matrix using look at.

    modelViewMatrix = mult(modelViewMatrix, rotate(-45, [0, 1, 0]));

    modelViewMatrix = mult(modelViewMatrix, rotate(theta[1], [0, 1, 0]));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[0], [1, 0, 0]));

    gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrixUniform, false, flatten(modelViewMatrix));  // Set the modelViewMatrix.

    gl.clearColor(1.0, 1.0, 1.0, 1.0); //color the background
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, offset, vertexCount); //draw

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
    offset = 0;

    aspectRatio = canvas.width / canvas.height;

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.0, 1.0, 0.0, 1.0); //color the background
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST);// Enable depth testing
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.cullFace(gl.BACK);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);// Clear the canvas before we start drawing on it.


    posBuffer = _createBufferObject(gl, verticesOfShape); //for positions

    colorF = gl.getUniformLocation(program, "fColor"); //color
    gl.uniform4f(colorF, 0.3, 0.3, 0.3, 1);

    const aPosition = gl.getAttribLocation(program, "pos");  // Get the location of the shader variables
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);      // Bind the position buffer.
    gl.enableVertexAttribArray(aPosition); // Enable the assignment to aPosition variable
    gl.vertexAttribPointer(aPosition, 3, type, normalize1, stride, offset); // Enable the assignment to aPosition variable


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
    $.ajax({
        url: filename,
        dataType: 'text'
    }).done(function (data) { //Send javascript object with AJAX
        loadMeshData(data);
    }).fail(function () {  //if it fail,alert it
        alert('Fail ' + filename);
    });
}

document.onkeydown = function (e) {
    switch (e.key) {
        case "+": //Use ‘+’ key to increases the rotation speed
            speed += 0.75;
            break;
        case "-": //Use ‘-’ key to decrease the rotation speed
            if (speed - 0.75 < 0)
                speed = 0;
            else
                speed -= 0.75;
            break;
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
            cameraPos[2] += 0.5;
            target[2] += 0.5;
            break;
        case "ArrowDown": //Use ‘ArrowDown’ key to moves to the backward
            cameraPos[2] -= 0.5;
            target[2] -= 0.5;
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
