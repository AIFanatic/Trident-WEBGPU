/* Gooact by SweetPalma, 2018. All rights reserved. */

type VNodeChild = VNode | string | number | boolean | null;

type PropsWithChildren<P = any> = P & {
    children?: VNodeChild[];
    key?: string;
    ref?: (el: HTMLElement) => void;
    style?: Partial<CSSStyleDeclaration> | string;
    className?: string;
    value?: any;
    checked?: boolean;
    [key: string]: any;
};

type FunctionComponent<P = any> = (props: PropsWithChildren<P>) => VNodeChild;

interface ComponentConstructor<P = any> {
    new(props: PropsWithChildren<P>): Component<P, any>;
}

interface VNode<P = any> {
    type: string | FunctionComponent<P> | ComponentConstructor<P>;
    props: PropsWithChildren<P>;
    children: VNodeChild[];
}

type GooactNode = Node & {
    __gooactInstance?: Component<any, any>;
    __gooactKey?: string;
};

type GooactHTMLElement = HTMLElement & {
    __gooactHandlers?: Record<string, EventListener>;
    __gooactKey?: string;
    __gooactInstance?: Component<any, any>;
};

export const createElement = (type: VNode['type'], props: PropsWithChildren | null, ...children: VNodeChild[]): VNode => {
    if (props === null) props = {};
    return { type, props, children };
};

const setAttribute = (dom: GooactHTMLElement, key: string, value: any): void => {
    if (typeof value == 'function' && key.startsWith('on')) {
        const eventType = key.slice(2).toLowerCase();
        dom.__gooactHandlers = dom.__gooactHandlers || {};
        dom.removeEventListener(eventType, dom.__gooactHandlers[eventType]);
        dom.__gooactHandlers[eventType] = value as EventListener;
        dom.addEventListener(eventType, dom.__gooactHandlers[eventType]);
    } else if (key == 'checked' || key == 'value' || key == 'className') (dom as any)[key] = value;
    else if (key == 'style' && typeof value == 'object') Object.assign(dom.style, value);
    else if (key == 'ref' && typeof value == 'function') (value as (el: HTMLElement) => void)(dom);
    else if (key == 'key') dom.__gooactKey = value;
    else if (typeof value != 'object' && typeof value != 'function') dom.setAttribute(key, value);
};

export const render = (vdom: VNodeChild, parent: HTMLElement | null = null): GooactNode => {
    const mount = parent ? (el: GooactNode) => {
            parent.appendChild(el);
            return el;
        } : (el: GooactNode) => el;

    if (typeof vdom == 'string' || typeof vdom == 'number') return mount(document.createTextNode(String(vdom)) as GooactNode);
    else if (typeof vdom == 'boolean' || vdom === null) return mount(document.createTextNode('') as GooactNode);
    else if (typeof vdom == 'object' && typeof (vdom as VNode).type == 'function') return Component.render(vdom as VNode, parent) as GooactNode;
    else if (typeof vdom == 'object' && typeof (vdom as VNode).type == 'string') {
        const dom = mount(document.createElement((vdom as VNode).type) as GooactNode) as GooactHTMLElement;
        for (const child of ([] as any[]).concat(...((vdom as VNode).children as any))) {
            render(child as VNodeChild, dom);
        }
        for (const prop in (vdom as VNode).props) {
            setAttribute(dom, prop, (vdom as VNode).props[prop]);
        }
        return dom as unknown as GooactNode;
    } else throw new Error(`Invalid VDOM: ${vdom}.`);
};

const patch = (dom: GooactNode, vdom: VNodeChild, parent: (Node & ParentNode) | null = dom.parentNode): GooactNode => {
    const replace = parent ? (el: GooactNode) => ((parent.replaceChild(el, dom), el)) : (el: GooactNode) => el;

    if (typeof vdom == 'object' && vdom !== null && typeof (vdom as VNode).type == 'function') return Component.patch(dom, vdom as VNode, parent) as GooactNode;
    else if ((typeof vdom != 'object' || vdom === null) && dom instanceof Text) return (dom.textContent != String(vdom)) ? replace(render(vdom, parent as any)) : dom;
    else if ((typeof vdom != 'object' || vdom === null)) return dom instanceof Text ? ((dom.textContent != String(vdom)) ? replace(render(vdom, parent as any)) : dom) : replace(render(vdom, parent as any));
    else if (typeof vdom == 'object' && dom instanceof Text) return replace(render(vdom, parent as any));
    else if (typeof vdom == 'object' && (dom as HTMLElement).nodeName != (vdom as VNode).type.toString().toUpperCase()) return replace(render(vdom, parent as any));
    else if (typeof vdom == 'object' && (dom as HTMLElement).nodeName == (vdom as VNode).type.toString().toUpperCase()) {
        const pool: Record<string, GooactNode> = {};
        const active = document.activeElement as HTMLElement;
        ([] as any[]).concat(...((dom as HTMLElement).childNodes as any)).map((child: GooactNode, index: number) => {
            const key = (child as any).__gooactKey || `__index_${index}`;
            pool[key] = child;
        });
        ([] as any[]).concat(...(((vdom as VNode).children) as any)).map((child: any, index: number) => {
            const key = (child.props && child.props.key) || `__index_${index}`;
            (dom as HTMLElement).appendChild(pool[key] ? (patch(pool[key], child) as Node) : (render(child, dom as any) as Node));
            delete pool[key];
        });
        for (const key in pool) {
            const instance = (pool[key] as GooactNode).__gooactInstance;
            if (instance) instance.componentWillUnmount();
            (pool[key] as any).remove();
        }
        // Reset attributes:
        for (const attr of (dom as HTMLElement).attributes as any) (dom as HTMLElement).removeAttribute(attr.name);
        for (const prop in (vdom as VNode).props) setAttribute(dom as GooactHTMLElement, prop, (vdom as VNode).props[prop]);
        active && active.focus();
        return dom;
    }
    return dom;
};

export class Component<P = any, S = any> {props: PropsWithChildren<P>; state: S | null; base?: GooactNode;
    constructor(props?: PropsWithChildren<P>) {
        this.props = (props || {}) as PropsWithChildren<P>;
        this.state = null;
    }

    static render(vdom: VNode, parent: HTMLElement | null = null): GooactNode {
        const props = Object.assign({}, vdom.props, { children: vdom.children }) as PropsWithChildren;
        if (Component.isPrototypeOf(vdom.type as any)) {
            const Ctor = vdom.type as ComponentConstructor<any>;
            const instance = new Ctor(props);
            instance.componentWillMount();
            instance.base = render(instance.render() as VNodeChild, parent);
            (instance.base as any).__gooactInstance = instance;
            (instance.base as any).__gooactKey = (vdom.props && (vdom.props as any).key) as string | undefined;
            instance.componentDidMount();
            return instance.base;
        } else {
            const func = vdom.type as FunctionComponent<any>;
            return render(func(props), parent);
        }
    }

    static patch(dom: GooactNode, vdom: VNode, parent: (Node & ParentNode) | null = dom.parentNode): GooactNode {
        const props = Object.assign({}, vdom.props, { children: vdom.children }) as PropsWithChildren;
        if ((dom as GooactNode).__gooactInstance && ((dom as GooactNode).__gooactInstance as any).constructor == vdom.type) {
            (dom as GooactNode).__gooactInstance!.componentWillReceiveProps(props);
            (dom as GooactNode).__gooactInstance!.props = props;
            return patch(dom, (dom as GooactNode).__gooactInstance!.render() as VNodeChild, parent);
        } else if (Component.isPrototypeOf(vdom.type as any)) {
            const ndom = Component.render(vdom, parent as any);
            return parent ? ((parent.replaceChild(ndom, dom), ndom)) : ndom;
        } else if (!Component.isPrototypeOf(vdom.type as any)) {
            const func = vdom.type as FunctionComponent<any>;
            return patch(dom, func(props), parent);
        }
        return dom;
    }

    // Note: the original behavior passes (this.props, nextState) to shouldComponentUpdate.
    setState(next: S): void {
        const compat = (a: any) => typeof this.state == 'object' && this.state !== null && typeof a == 'object' && a !== null;
        if (this.base && this.shouldComponentUpdate(this.props as P, next)) {
            const prevState = this.state as S;
            this.componentWillUpdate(this.props as P, next);
            this.state = (compat(next) ? Object.assign({}, this.state, next) : next) as S;
            patch(this.base as GooactNode, this.render() as VNodeChild);
            this.componentDidUpdate(this.props as P, prevState);
        } else {
            this.state = (compat(next) ? Object.assign({}, this.state, next) : next) as S;
        }
    }

    shouldComponentUpdate(nextProps: P, nextState: S): boolean { return nextProps != (this.props as any) || nextState != (this.state as any); }
    componentWillReceiveProps(nextProps: P): void { return undefined as unknown as void }
    componentWillUpdate(nextProps: P, nextState: S): void { return undefined as unknown as void; }
    componentDidUpdate(prevProps: P, prevState: S): void { return undefined as unknown as void; }
    componentWillMount(): void { return undefined as unknown as void; }
    componentDidMount(): void { return undefined as unknown as void; }
    componentWillUnmount(): void { return undefined as unknown as void; }

    render(_?: any): VNodeChild { return null; }
}