import { GLSL2WGSL } from "@trident/plugins/GLSLParser/GLSLParser";

document.querySelector("canvas").style.display = "none";
document.body.style.display = "flex";

const inputText = document.createElement("textarea");
const outputTex = document.createElement("textarea");
const convertButton = document.createElement("button");
convertButton.textContent = ">"
convertButton.style.width = "50px"
convertButton.addEventListener("click", () => {
    try {
        outputTex.value = GLSL2WGSL(inputText.value);
    } catch (error) {
        outputTex.value = `ERROR: ${error}`;
    }
})

inputText.style = "width: calc(50% - 25px); height: 100%;"
inputText.placeholder = "Enter GLSL...";
outputTex.style = "width: calc(50% - 25px); height: 100%;"
outputTex.placeholder = "Press button, get WGSL...";
document.body.append(inputText, convertButton, outputTex);
console.log("HER")