import { Appearance } from './Appearance';
import { ColumnCountType } from './ColumnCountType';
import { HyphenType } from './HyphenType';
import { TextAlign } from './TextAlign';
import { View } from './View';

export interface PresentationSettingsConfig {
  columnCountType?: ColumnCountType;
  advancedSettings?: boolean;
  hyphens?: HyphenType;
  fontOverride?: boolean;
  fontSize?: number;
  fontFamily?: string;
  appearance?: Appearance;
  view?: View;
  textAlign?: TextAlign;
  wordSpacing?: number;
  letterSpacing?: number;
  pageMargins?: number;
  lineHeight?: number;
  accessibility?: boolean;
  backgroundColor?: string;
  textColor?: string;
  typeScale?: number;
  paragraphSpacing?: number;
  paragraphIndent?: number;
}
