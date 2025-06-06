import React from "react";

interface FlagIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function UKFlagIcon({ className, ...props }: FlagIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 30"
      className={className}
      {...props}
    >
      <clipPath id="a">
        <path d="M0 0v30h60V0z" />
      </clipPath>
      <clipPath id="b">
        <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
      </clipPath>
      <g clipPath="url(#a)">
        <path d="M0 0v30h60V0z" fill="#012169" />
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0 0l60 30m0-30L0 30"
          clipPath="url(#b)"
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

export function CzechFlagIcon({ className, ...props }: FlagIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 600 400"
      className={className}
      {...props}
    >
      <path fill="#d7141a" d="M0 0h600v400H0z" />
      <path fill="#fff" d="M0 0h600v200H0z" />
      <path fill="#11457e" d="M300 200L0 0v400z" />
    </svg>
  );
}