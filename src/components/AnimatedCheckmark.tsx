export default function AnimatedCheckmark({ 
    className = "", 
    size = "w-8 h-8" 
}: { 
    className?: string; 
    size?: string; 
}) {
    return (
        <svg 
            className={`${size} ${className}`}
            viewBox="0 0 52 52" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <path 
                className="fill-none stroke-current"
                d="M14 27l7 7 16-16" 
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="48"
                strokeDashoffset="48"
                style={{
                    animation: 'checkmark-draw 0.8s ease-in-out forwards'
                }}
            />
            <style jsx>{`
                @keyframes checkmark-draw {
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
        </svg>
    );
}
