import React from 'react';
import { ExtendedDataTransfer } from '../../helpers/ExtendedDataTransfer';

import './InspectorComponent.css';

export class Class {};

interface InspectorTextureProps {
    component: Class;
    property: string;
    acceptedType: Class;
    title: string;
    onChanged?: (value: string) => void;
};

export class InspectorTexture extends React.Component<InspectorTextureProps> {
    constructor(props: InspectorTextureProps) {
        super(props);
    }

    private onDrop(event: React.DragEvent<HTMLDivElement>) {
        const isValid = ExtendedDataTransfer.validate(this.props.acceptedType);
        if (!isValid) {
            ExtendedDataTransfer.remove(event);
            return;
        }

        const data = ExtendedDataTransfer.get();
        this.props.component[this.props.property] = data;

        const input = event.currentTarget as HTMLDivElement;
        if(input.classList.contains("active")) {
            input.classList.remove("active");
        }

        ExtendedDataTransfer.remove(event);

        if (this.props.onChanged) {
            const input = event.currentTarget as HTMLDivElement;
            this.props.onChanged(data)
        }

        event.preventDefault();
        event.stopPropagation();

        this.forceUpdate();
    }

    private onDragOver(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
    }

    private onDragEnter(event: React.DragEvent<HTMLDivElement>) {
        const isValid = ExtendedDataTransfer.validate(this.props.acceptedType);
        if (!isValid) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const input = event.currentTarget as HTMLDivElement;
        if(!input.classList.contains("active")) {
            input.classList.add("active");
        }
    }

    private onDragLeave(event: React.DragEvent<HTMLDivElement>) {
        const input = event.currentTarget as HTMLDivElement;
        if(input.classList.contains("active")) {
            input.classList.remove("active");
        }
    }

    public render() {
        return <div className="InspectorComponent">
        <div className="title">
            <div 
                className="input"
                style={{
                    width: "20px",
                    height: "20px",
                    // background: "#333333",
                    border: "1px solid black",
                    marginRight: "3px",
                    padding: "0px"
                }}
                onDragEnter={(event) => this.onDragEnter(event)}
                onDragLeave={(event) => this.onDragLeave(event)}
                onDrop={(event) => this.onDrop(event)}
                onDragOver={(event) => this.onDragOver(event)}
            >
                {
                    this.props.component[this.props.property] && this.props.component[this.props.property].image ?
                    <img 
                    style={{
                        width: "100%",
                        height: "100%"
                    }}
                    src={this.props.component[this.props.property].image.src} />
                    : ""
                }
            </div>
            <span style={{width: "inherit"}}>{this.props.title}</span>
        </div>

            {this.props.children}
        </div>
    }
}