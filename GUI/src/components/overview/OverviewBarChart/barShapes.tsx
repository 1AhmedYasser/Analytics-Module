import React from 'react';
import { OverviewChartBucket } from './useOverviewChartData';

const STACK_GAP = 2;
const CORNER_RADIUS = 4;

type SegmentKey = keyof Pick<OverviewChartBucket, 'burokratt' | 'csa' | 'leftWithoutAnswer'>;

const SEGMENT_ORDER: SegmentKey[] = ['burokratt', 'csa', 'leftWithoutAnswer'];

type BarShapeProps = {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly fill?: string;
  readonly payload?: OverviewChartBucket;
  readonly bucket?: number;
  readonly burokratt?: number;
  readonly csa?: number;
  readonly leftWithoutAnswer?: number;
};

const getBucket = (props: BarShapeProps): OverviewChartBucket | null => {
  if (props.payload) return props.payload;

  if (props.bucket !== undefined) {
    return {
      bucket: props.bucket,
      burokratt: props.burokratt ?? 0,
      csa: props.csa ?? 0,
      leftWithoutAnswer: props.leftWithoutAnswer ?? 0,
    };
  }

  return null;
};

const hasSegmentBelow = (payload: OverviewChartBucket, segment: SegmentKey): boolean =>
  SEGMENT_ORDER.slice(0, SEGMENT_ORDER.indexOf(segment)).some((key) => payload[key] > 0);

const hasSegmentAbove = (payload: OverviewChartBucket, segment: SegmentKey): boolean =>
  SEGMENT_ORDER.slice(SEGMENT_ORDER.indexOf(segment) + 1).some((key) => payload[key] > 0);

export const createStackedBarShape = (segment: SegmentKey) => (props: BarShapeProps) => {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  const payload = getBucket(props);

  if (!height || height <= 0 || !payload) return null;

  const gapAbove = hasSegmentAbove(payload, segment) ? STACK_GAP / 2 : 0;
  const gapBelow = hasSegmentBelow(payload, segment) ? STACK_GAP / 2 : 0;
  const adjustedHeight = height - gapAbove - gapBelow;

  if (adjustedHeight <= 0) return null;

  const adjustedY = y + gapAbove;
  const radius = Math.min(CORNER_RADIUS, width / 2, adjustedHeight / 2);

  return <rect x={x} y={adjustedY} width={width} height={adjustedHeight} fill={fill} rx={radius} ry={radius} />;
};
