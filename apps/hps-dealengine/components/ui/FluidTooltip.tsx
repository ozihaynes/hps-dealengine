import React from "react";
import { Tooltip, TooltipProps } from "./tooltip";

type FluidTooltipProps = TooltipProps;

export const FluidTooltip: React.FC<FluidTooltipProps> = (props) => {
  return <Tooltip {...props} />;
};
