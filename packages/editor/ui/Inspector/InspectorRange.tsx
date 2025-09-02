import React from 'react';

import './InspectorComponent.css';

interface InspectorRangeProps {
    title: string;
    value: string | number;
    min?: number;
    max?: number;
    step?: number;
    onChanged?: (value: string) => void;
};

export class InspectorRange extends React.Component<InspectorRangeProps> {
    constructor(props: InspectorRangeProps) {
        super(props);
    }

    private onChanged(event: React.ChangeEvent<HTMLInputElement>) {
        if (this.props.onChanged) {
            const input = event.currentTarget as HTMLInputElement;
            this.props.onChanged(input.value)
        }
    }

    public render() {
        return <div className="InspectorComponent">
            <span className="title">{this.props.title}</span>

            <input
                style={{
                    width: "45%"
                }}
                className="input range"
                type="range"
                min={this.props.min ? this.props.min : 0}
                max={this.props.max ? this.props.max : 1}
                step={this.props.step ? this.props.step : 0.01}
                onChange={(event) => {this.onChanged(event)}}
                value={this.props.value}
            />
            <input
                style={{
                    width: "20%"
                }}
                className="input"
                type="number"
                min={this.props.min ? this.props.min : 0}
                max={this.props.max ? this.props.max : 1}
                step={this.props.step ? this.props.step : 0.01}
                onChange={(event) => {this.onChanged(event)}}
                value={this.props.value}
            />
        </div>
    }
}