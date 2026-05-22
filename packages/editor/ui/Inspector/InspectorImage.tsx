import { createElement, Component } from "../../gooact";
import { AssetMeta, Assets, GPU } from "@trident/core";
import { SaveToFile } from "../../commands/SaveToFile";
import { ReloadTexture } from "../../commands/ReloadTexture";
import { Collapsible } from "../Collapsible/Collapsible";
import { InspectorDropdown, InspectorDropdownOptions } from "./InspectorDropdown";
import { InspectorCheckbox } from "./InspectorCheckbox";
import { StringUtils } from "../../helpers/StringUtils";

import './InspectorComponent.css';

const TEXTURE_FORMAT_OPTIONS: InspectorDropdownOptions[] = [
    { text: "rgba8unorm", value: "rgba8unorm" },
    { text: "rgba8unorm-srgb", value: "rgba8unorm-srgb" },
    { text: "bgra8unorm", value: "bgra8unorm" },
    { text: "bgra8unorm-srgb", value: "bgra8unorm-srgb" },
    { text: "rgba16float", value: "rgba16float" },
];

interface InspectorImageProps {
    texture: GPU.Texture;
    onSaved?: (texture: GPU.Texture) => void;
};

interface InspectorImageState {
    format: GPU.TextureFormat;
    generateMips: boolean;
    loaded: boolean;
};

export class InspectorImage extends Component<InspectorImageProps, InspectorImageState> {
    private currentTex: GPU.Texture;

    constructor(props: InspectorImageProps) {
        super(props);
        this.currentTex = props.texture;
        this.state = {
            format: props.texture.format,
            generateMips: props.texture.mipLevels > 1,
            loaded: false,
        };
        this.LoadFromMeta();
    }

    private async LoadFromMeta() {
        const tex = this.currentTex;
        if (!tex.assetPath) { this.setState({ ...this.state, loaded: true }); return; }
        const meta = await AssetMeta.Load<any>(tex.assetPath);
        this.setState({
            ...this.state,
            format: meta?.format ?? tex.format,
            generateMips: meta?.generateMips ?? (tex.mipLevels > 1),
            loaded: true,
        });
    }

    private async SaveClicked() {
        const tex = this.currentTex;
        if (!tex.assetPath) return;
        const existing = (await AssetMeta.Load<any>(tex.assetPath)) ?? {};
        const next = { ...existing, format: this.state.format, generateMips: this.state.generateMips };
        await SaveToFile(AssetMeta.MetaPathFor(tex.assetPath), AssetMeta.SerializeBlob(next));
        this.currentTex = await ReloadTexture(tex.assetPath);
        if (this.props.onSaved) this.props.onSaved(this.currentTex);
    }

    public render() {
        const tex = this.currentTex;
        let title = tex.name;
        if (tex.assetPath) title = StringUtils.GetNameForPath(tex.assetPath);

        return <div style={{ height: "100%", overflow: "auto", width: "100%" }}>
            <Collapsible header={`Image: ${title}`}>
                <InspectorDropdown
                    title="Format"
                    options={TEXTURE_FORMAT_OPTIONS}
                    selected={this.state.format}
                    onSelected={(value) => { this.setState({ ...this.state, format: value as GPU.TextureFormat }) }}
                />
                <InspectorCheckbox
                    title="Generate Mips"
                    selected={this.state.generateMips}
                    onChanged={(value) => { this.setState({ ...this.state, generateMips: value }) }}
                />
            </Collapsible>

            <button
                class="Floating-Menu"
                style={{ position: "initial", margin: "10px", width: "calc(100% - 20px)", color: "white", cursor: "pointer" }}
                onClick={event => { this.SaveClicked() }}
            >
                SAVE
            </button>
        </div>
    }
}