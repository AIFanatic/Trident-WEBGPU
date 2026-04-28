import { createElement, Component } from "../../gooact";
  import { InspectorClass } from "./InspectorClass";
  import { InspectorType } from "./InspectorType";
  import { IEngineAPI } from "../../engine-api/trident/IEngineAPI";
  import { StringUtils } from "../../helpers/StringUtils";

  import './InspectorComponent.css';

  export interface InspectorArrayProps {
      title: string;
      array: any[];
      elementType?: Function;
      engineAPI?: IEngineAPI;
      renderItem: (item: any, index: number) => Node;
      onChanged?: () => void;
  }

  export class InspectorArray extends Component<InspectorArrayProps> {
      private isRefType(): boolean {
          if (!this.props.engineAPI || !this.props.elementType) return false;
          const t = this.props.engineAPI.getFieldType(this.props.elementType);
          return t !== "unknown";
      }

      private onIncrement() {
          if (!this.props.elementType) return;

          this.props.array.push(this.isRefType() ? null : new (this.props.elementType as any)());

          if (this.props.onChanged) this.props.onChanged();
          this.setState({});
      }

      private onDecrement() {
          if (this.props.array.length === 0) return;

          this.props.array.pop();

          if (this.props.onChanged) this.props.onChanged();
          this.setState({});
      }

      private renderRefItem(item: any, index: number): Node {
          let valueForType = "None";
          if (item?.assetPath) valueForType = StringUtils.GetNameForPath(item.assetPath);
          else if (item?.name) valueForType = item.name;

          return <InspectorType
              onChanged={(value) => { this.props.array[index] = value; this.setState({}); if (this.props.onChanged) this.props.onChanged(); }}
              title={`${this.props.title} ${index}`}
              component={this.props.array}
              property={index}
              value={valueForType}
              expectedType={this.props.elementType}
          />
      }

      public render() {
          const isRef = this.isRefType();

          return <div>
              <InspectorClass title={this.props.title}>
                  {...this.props.array.map((item, index) => {
                      return isRef ? this.renderRefItem(item, index) : this.props.renderItem(item, index);
                  })}
                  <div style={{ width: "100%", textAlign: "end" }}>
                      <button onClick={event => { this.onIncrement(event) }} class="input" style={{ width: "22px", cursor: "pointer" }}>+</button>
                      <button onClick={event => { this.onDecrement(event) }} class="input" style={{ width: "22px", cursor: "pointer" }}>-</button>
                  </div>
              </InspectorClass>
          </div>
      }
  }