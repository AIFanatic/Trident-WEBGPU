struct VertexInput {
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>,
};

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) vPos : vec4<f32>,
    @location(1) vNormal : vec3<f32>,
};

@group(0) @binding(1) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(3) var<storage, read> modelMatrix: array<mat4x4<f32>>;

@vertex
fn vertexMain(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {
    var output : VertexOutput;

    var modelMatrixInstance = modelMatrix[instanceIdx];
    var modelViewMatrix = viewMatrix * modelMatrixInstance;
    
    output.Position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
    output.vPos = modelViewMatrix * vec4(input.position, 1.0);
    
    output.vNormal = normalize((modelViewMatrix * vec4(input.normal, 0.0)).xyz);

    return output;
}

@fragment
fn fragmentMain(fragData: VertexOutput) -> @location(0) vec4<f32> {
    let surfaceColor: vec4<f32> = vec4(1.0, 0.0, 0.0, 1.0);
    let ambientColor: vec4<f32> = vec4(surfaceColor);
    let specularColor: vec4<f32> = vec4(1.0);
    let lightPosition_worldSpace: vec4<f32> = vec4(10.0, 10.0, 10.0, 1.0);
    let lightColor: vec3<f32> = vec3(0.3, 0.3, 0.3);
    let lightIntensity = 250.0;
    let specularLobeFactor = 5.0;
    let ambientFactor = 0.1;
    let specularReflectivity = 0.5;

    let lightPosition_viewSpace: vec3<f32> = (viewMatrix * lightPosition_worldSpace).xyz;
    let lightDirection_viewSpace: vec3<f32> = normalize(lightPosition_viewSpace - fragData.vPos.xyz);
    let viewDirection_viewSpace: vec3<f32> = normalize(-fragData.vPos.xyz); // Corrected view direction

    let lightColorIntensity: vec3<f32> = lightColor * lightIntensity;
    let distanceFromLight = distance(fragData.vPos.xyz, lightPosition_viewSpace);

    let diffuseStrength = clamp(dot(fragData.vNormal, lightDirection_viewSpace), 0.0, 1.0);
    let diffuseLight = (lightColorIntensity * diffuseStrength) / (distanceFromLight * distanceFromLight);

    let lightReflection_viewSpace = reflect(-lightDirection_viewSpace, fragData.vNormal);

    let specularStrength = clamp(dot(viewDirection_viewSpace, lightReflection_viewSpace), 0.0, 1.0);
    let specularLight = (lightColorIntensity * pow(specularStrength, specularLobeFactor)) / (distanceFromLight * distanceFromLight);

    return vec4(
        vec3((ambientColor.rgb * ambientFactor) + (surfaceColor.rgb * diffuseLight) + (specularColor.rgb * specularReflectivity * specularLight)), 
        surfaceColor.a
    );
}