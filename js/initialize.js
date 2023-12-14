"use strict";

function _createBufferObject(gl, array){

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

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {  //If that's false, we know the shader failed to compile
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