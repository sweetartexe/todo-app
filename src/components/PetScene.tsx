import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { Outfit } from '@/domain/types';

const SCENES: Record<string, { top: string; bottom: string; ground: string; night?: boolean }> = {
  'bg-cozy': { top: '#FFE6C2', bottom: '#FFF8EF', ground: '#F0CBA8' },
  'bg-sunrise': { top: '#FFB088', bottom: '#FFE7B0', ground: '#F3C98A' },
  'bg-meadow': { top: '#B7E4FF', bottom: '#E7F8D4', ground: '#74C86A' },
  'bg-night': { top: '#1C2348', bottom: '#3C4278', ground: '#2A2144', night: true },
  'bg-beach': { top: '#8FD4FF', bottom: '#FFE6B5', ground: '#F6D48A' },
};

export function PetScene({
  outfit,
  mood = 'idle',
  size = 320,
  animate = true,
}: {
  outfit: Outfit;
  mood?: 'idle' | 'happy';
  size?: number;
  animate?: boolean;
}) {
  const height = Math.round(size * 0.92);
  const scene = SCENES[outfit.background || 'bg-cozy'] ?? SCENES['bg-cozy'];
  const bob = useRef(new Animated.Value(0)).current;
  const [shift, setShift] = useState(0);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!animate) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: mood === 'happy' ? -10 : -6,
          duration: mood === 'happy' ? 280 : 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: mood === 'happy' ? 280 : 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    const id = bob.addListener(({ value }) => setShift(value));
    loop.start();
    return () => {
      loop.stop();
      bob.removeListener(id);
    };
  }, [animate, bob, mood]);

  useEffect(() => {
    if (!animate) return undefined;
    const timer = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3200);
    return () => clearInterval(timer);
  }, [animate]);

  return (
    <View style={[styles.frame, { width: size, height, borderRadius: size * 0.08 }]}>
      <Svg width={size} height={height} viewBox="0 0 320 294">
        <Rect x="0" y="0" width="320" height="294" fill={scene.top} />
        <Rect x="0" y="120" width="320" height="174" fill={scene.bottom} />
        <Backdrop id={outfit.background || 'bg-cozy'} night={scene.night} />
        <Ellipse cx="160" cy="250" rx="120" ry="28" fill={scene.ground} />
        {outfit.furniture === 'furn-rug' ? <Ellipse cx="176" cy="246" rx="78" ry="16" fill="#E07A5F" opacity="0.85" /> : null}
        {outfit.furniture === 'furn-shelf' ? <Shelf /> : null}
        {outfit.furniture === 'furn-lamp' ? <Lamp /> : null}
        {outfit.plant ? <Plant id={outfit.plant} /> : null}
        <G transform={`translate(176 ${188 + shift}) scale(${mood === 'happy' ? 1.06 : 1})`}>
          <PetBody blink={blink} night={Boolean(scene.night)} />
          <Hat id={outfit.hat} />
        </G>
        {mood === 'happy' ? (
          <G>
            <Circle cx="78" cy="70" r="4" fill="#FFE08A" />
            <Circle cx="250" cy="54" r="3" fill="#FFFFFF" />
            <Circle cx="230" cy="88" r="2.5" fill="#FFE08A" />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

function Backdrop({ id, night }: { id: string; night?: boolean }) {
  if (id === 'bg-night' || night) {
    return (
      <G>
        <Circle cx="40" cy="36" r="1.5" fill="#FFF" />
        <Circle cx="90" cy="22" r="1.2" fill="#FFF" />
        <Circle cx="150" cy="40" r="1.4" fill="#FFF" />
        <Circle cx="210" cy="18" r="1.6" fill="#FFF" />
        <Circle cx="270" cy="46" r="1.2" fill="#FFF" />
        <Circle cx="250" cy="70" r="10" fill="#F4E7C5" opacity="0.9" />
      </G>
    );
  }
  if (id === 'bg-sunrise') return <Circle cx="250" cy="68" r="28" fill="#FFE38A" />;
  if (id === 'bg-meadow') {
    return (
      <G>
        <Ellipse cx="40" cy="230" rx="70" ry="24" fill="#8ED67A" />
        <Ellipse cx="280" cy="220" rx="80" ry="26" fill="#69BE62" />
        <Circle cx="48" cy="150" r="16" fill="#FFFFFF" opacity="0.8" />
      </G>
    );
  }
  if (id === 'bg-beach') {
    return (
      <G>
        <Rect x="0" y="150" width="320" height="70" fill="#67C6E6" />
        <Circle cx="60" cy="48" r="18" fill="#FFE38A" />
      </G>
    );
  }
  return (
    <G>
      <Rect x="22" y="28" width="74" height="56" rx="8" fill="#FFFDF8" />
      <Rect x="22" y="28" width="74" height="56" rx="8" stroke="#E3B48A" strokeWidth="4" fill="none" />
      <Path d="M59 28 V84 M22 56 H96" stroke="#E3B48A" strokeWidth="3" />
    </G>
  );
}

function PetBody({ blink, night }: { blink: boolean; night: boolean }) {
  const eye = blink ? 1.2 : 7;
  return (
    <G>
      <Ellipse cx="-30" cy="52" rx="16" ry="10" fill="#E7A07E" />
      <Ellipse cx="28" cy="52" rx="16" ry="10" fill="#E7A07E" />
      <Ellipse cx="-46" cy="10" rx="12" ry="8" fill="#FFBF9A" transform="rotate(-20 -46 10)" />
      <Ellipse cx="46" cy="10" rx="12" ry="8" fill="#FFBF9A" transform="rotate(20 46 10)" />
      <Ellipse cx="0" cy="8" rx="58" ry="50" fill={night ? '#FFC2A2' : '#FFB489'} />
      <Ellipse cx="0" cy="24" rx="34" ry="26" fill="#FFE3D2" />
      <Circle cx="-18" cy="-6" r="4.5" fill="#FF8D86" opacity="0.85" />
      <Circle cx="18" cy="-6" r="4.5" fill="#FF8D86" opacity="0.85" />
      <Ellipse cx="-14" cy="-16" rx="5" ry={eye} fill="#3A2718" />
      <Ellipse cx="14" cy="-16" rx="5" ry={eye} fill="#3A2718" />
      {!blink ? <Circle cx="-12.5" cy="-18" r="1.6" fill="#FFF" /> : null}
      {!blink ? <Circle cx="15.5" cy="-18" r="1.6" fill="#FFF" /> : null}
      <Path d="M-8 2 Q0 10 8 2" stroke="#3A2718" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </G>
  );
}

function Hat({ id }: { id: string | null }) {
  if (id === 'hat-party') {
    return (
      <G>
        <Path d="M0 -78 L22 -34 L-22 -34 Z" fill="#FF6B4A" />
        <Path d="M-8 -58 L8 -46" stroke="#FFE08A" strokeWidth="3" />
        <Circle cx="0" cy="-80" r="4" fill="#FFE08A" />
      </G>
    );
  }
  if (id === 'hat-crown') {
    return <Path d="M-24 -46 L-16 -72 L-4 -50 L0 -76 L4 -50 L16 -72 L24 -46 Z" fill="#F0B429" />;
  }
  if (id === 'hat-beanie') {
    return (
      <G>
        <Path d="M-28 -28 Q-30 -62 0 -66 Q30 -62 28 -28 Z" fill="#3D8ECA" />
        <Ellipse cx="0" cy="-28" rx="30" ry="8" fill="#2E74AB" />
        <Circle cx="0" cy="-70" r="7" fill="#F4E7C5" />
      </G>
    );
  }
  if (id === 'hat-sprout') {
    return (
      <G>
        <Path d="M0 -40 V-62" stroke="#3E9B4A" strokeWidth="3" strokeLinecap="round" />
        <Ellipse cx="-8" cy="-66" rx="10" ry="6" fill="#67C56A" transform="rotate(-30 -8 -66)" />
        <Ellipse cx="8" cy="-68" rx="10" ry="6" fill="#3E9B4A" transform="rotate(28 8 -68)" />
      </G>
    );
  }
  return null;
}

function Plant({ id }: { id: string }) {
  return (
    <G transform="translate(58 214)">
      <Path d="M-16 20 H16 L12 36 H-12 Z" fill="#C47B4A" />
      <Rect x="-14" y="16" width="28" height="6" rx="2" fill="#A8653A" />
      {id === 'plant-cactus' ? (
        <G>
          <Path d="M-8 16 V-10 Q-8 -28 0 -28 Q8 -28 8 16" fill="#3E9B4A" />
          <Path d="M-8 -2 H-16 V8" stroke="#3E9B4A" strokeWidth="6" strokeLinecap="round" />
          <Path d="M8 -6 H16 V4" stroke="#2F7D3A" strokeWidth="6" strokeLinecap="round" />
        </G>
      ) : null}
      {id === 'plant-monstera' ? (
        <Path d="M0 16 C-28 10 -36 -20 -8 -34 C8 -18 10 -8 0 16 C14 -6 34 -16 30 4 C22 14 8 16 0 16" fill="#2F9E6B" />
      ) : null}
      {id === 'plant-sprout' ? (
        <G>
          <Path d="M0 16 V-8" stroke="#3E9B4A" strokeWidth="3" />
          <Ellipse cx="-8" cy="-10" rx="10" ry="6" fill="#7ED37A" transform="rotate(-40 -8 -10)" />
          <Ellipse cx="8" cy="-12" rx="10" ry="6" fill="#3E9B4A" transform="rotate(36 8 -12)" />
        </G>
      ) : null}
    </G>
  );
}

function Shelf() {
  return (
    <G>
      <Rect x="230" y="78" width="70" height="8" rx="2" fill="#C47B4A" />
      <Rect x="238" y="52" width="12" height="26" fill="#FF6B4A" />
      <Rect x="254" y="46" width="12" height="32" fill="#3D8ECA" />
      <Rect x="270" y="56" width="14" height="22" fill="#F0B429" />
    </G>
  );
}

function Lamp() {
  return (
    <G>
      <Circle cx="262" cy="150" r="22" fill="#FFE7A0" opacity="0.9" />
      <Path d="M248 156 H276 L270 132 H254 Z" fill="#F0B429" />
      <Rect x="259" y="156" width="6" height="36" fill="#C47B4A" />
      <Rect x="250" y="190" width="24" height="6" rx="2" fill="#A8653A" />
    </G>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#FFF8EF', alignSelf: 'center' },
});
