declare const _default: {
    content: string[];
    theme: {
        extend: {
            colors: {
                abyss: string;
                navy: string;
                radar: string;
                phosphor: string;
                alert: string;
                ink: string;
            };
            fontFamily: {
                sans: [string, string, string, string];
            };
            boxShadow: {
                radar: string;
                glass: string;
            };
            keyframes: {
                pulseRing: {
                    "0%": {
                        transform: string;
                        opacity: string;
                    };
                    "100%": {
                        transform: string;
                        opacity: string;
                    };
                };
                drift: {
                    "0%, 100%": {
                        transform: string;
                    };
                    "50%": {
                        transform: string;
                    };
                };
                glowSweep: {
                    "0%": {
                        transform: string;
                        opacity: string;
                    };
                    "30%": {
                        opacity: string;
                    };
                    "100%": {
                        transform: string;
                        opacity: string;
                    };
                };
            };
            animation: {
                pulseRing: string;
                drift: string;
                glowSweep: string;
            };
            backgroundImage: {
                "radar-grid": string;
            };
        };
    };
    plugins: any[];
};
export default _default;
