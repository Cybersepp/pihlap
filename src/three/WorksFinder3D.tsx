import { MouseEvent } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Work } from '../data/works';
import { MovIcon } from '../components/Icons';
import { IconClickOrigin } from '../components/DesktopIcon';
import { GALLERY } from './poses';
import { Window3D } from './Window3D';

// Fixed window size (CSS px) — scaled into the world by Window3D / GALLERY.scale.
const WIN_W = 760;
const WIN_H = 520;

export interface WorksFinder3DProps {
  works: Work[];
  selectedWorkId?: string;
  /** Selecting a file passes its measured world position so the camera can fly to it. */
  onSelect: (work: Work, origin: IconClickOrigin, world: [number, number, number]) => void;
  onClose: () => void;
}

// The real Finder window (glass panel, traffic lights, "selected works" titlebar,
// grid) rendered as one 3D panel in the gallery center (see Window3D). Clicking a
// file raycasts the click onto the panel plane to recover its exact world position
// — independent of drei's Html-transform scaling — so the camera can fly to it.
export function WorksFinder3D({ works, selectedWorkId, onSelect, onClose }: WorksFinder3DProps) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  function handleItemClick(e: MouseEvent<HTMLDivElement>, work: Work) {
    const origin: IconClickOrigin = { x: e.clientX, y: e.clientY };

    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);

    const normal = new THREE.Vector3(Math.sin(GALLERY.faceY), 0, Math.cos(GALLERY.faceY));
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      normal,
      new THREE.Vector3(...GALLERY.center),
    );
    const hit = new THREE.Vector3();
    const world: [number, number, number] = raycaster.ray.intersectPlane(plane, hit)
      ? [hit.x, hit.y, hit.z]
      : [...GALLERY.center];

    onSelect(work, origin, world);
  }

  return (
    <Window3D>
      <div
        className="window finder-3d"
        style={{
          position: 'relative',
          width: WIN_W,
          height: WIN_H,
          backfaceVisibility: 'hidden',
          pointerEvents: 'auto',
        }}
      >
        {/* Title bar with traffic lights — red closes the gallery. */}
        <div className="window-titlebar">
          <div className="traffic-lights">
            <button className="tl tl--close" onClick={onClose} aria-label="Close" />
            <span className="tl tl--min tl--dim" aria-hidden="true" />
            <span className="tl tl--zoom tl--dim" aria-hidden="true" />
          </div>
          <span className="window-titlebar-title">selected works</span>
        </div>

        <div className="finder">
          <div className="finder-main">
            <div className="finder-grid">
              {works.map((work) => (
                <div
                  key={work.id}
                  className={`finder-item${selectedWorkId === work.id ? ' is-selected' : ''}`}
                  onClick={(e) => handleItemClick(e, work)}
                >
                  <div className="finder-item-glyph">
                    <MovIcon size={48} />
                  </div>
                  <span className="finder-item-label">{work.title}</span>
                </div>
              ))}
            </div>
            <div className="finder-statusbar">{works.length} items</div>
          </div>
        </div>
      </div>
    </Window3D>
  );
}
