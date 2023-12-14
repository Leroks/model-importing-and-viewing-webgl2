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
