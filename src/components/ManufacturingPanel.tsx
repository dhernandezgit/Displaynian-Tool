import { CircleGauge, Cog, Flame, HardDrive, Printer, Ruler, Scissors, ShieldCheck } from "lucide-react";
import type { AppSettings } from "../types";
import { LASER_MATERIALS, MATERIALS, SHEETS } from "../lib/defaults";
import { NumberField, Section, SelectField, Toggle } from "./Field";

export default function ManufacturingPanel({
  settings,
  onPatch,
}: {
  settings: AppSettings;
  onPatch: (patch: Partial<AppSettings>) => void;
}) {
  return (
    <div className="manufacturing-panel">
      {settings.mode === "3d" ? (
        <>
          <Section title="Impresión 3D" subtitle="FDM, material y calidad" icon={<Printer size={15} />} defaultOpen>
            <SelectField label="Material" value={settings.material} options={MATERIALS.map((item) => ({ value: item.id, label: item.label }))} onChange={(value) => onPatch({ material: value })} />
            <NumberField label="Boquilla" value={settings.nozzle} min={0.2} max={1.2} step={0.05} onChange={(value) => onPatch({ nozzle: value })} />
            <NumberField label="Altura de capa" value={settings.layerHeight} min={0.08} max={0.6} step={0.02} onChange={(value) => onPatch({ layerHeight: value })} />
            <NumberField label="Paredes" value={settings.walls} min={1} max={12} step={1} unit="" onChange={(value) => onPatch({ walls: value })} />
            <NumberField label="Relleno" value={settings.infill} min={0} max={100} step={1} unit="%" onChange={(value) => onPatch({ infill: value })} />
            <NumberField label="Holgura de encaje" value={settings.clearance} min={0.05} max={1} step={0.01} onChange={(value) => onPatch({ clearance: value })} />
          </Section>
          <Section title="Uniones" subtitle="Pivotes, pasadores y clips" icon={<Cog size={15} />} defaultOpen>
            <SelectField
              label="Sistema de unión"
              value={settings.joinery}
              options={[
                { value: "snap", label: "Clip impreso" },
                { value: "dowel", label: "Pasadores impresos" },
                { value: "chicago", label: "Tornillos Chicago M5" },
                { value: "hybrid", label: "Híbrido (recomendado)" },
              ]}
              onChange={(value) => onPatch({ joinery: value })}
            />
            <Toggle label="Escuadras de esquina" checked={settings.cornerBrackets} onChange={(value) => onPatch({ cornerBrackets: value })} />
            <NumberField label="Longitud de escuadra" value={settings.cornerLeg} min={12} max={90} step={1} onChange={(value) => onPatch({ cornerLeg: value })} />
            <NumberField label="Separación de esquina" value={settings.cornerInset} min={6} max={80} step={1} onChange={(value) => onPatch({ cornerInset: value })} />
            <NumberField label="Tornillo de esquina" value={settings.cornerScrew} min={1} max={10} step={0.1} onChange={(value) => onPatch({ cornerScrew: value })} hint="Diámetro del agujero" />
            <Toggle label="Clips de unión de panel" checked={settings.panelJoiners} onChange={(value) => onPatch({ panelJoiners: value })} />
            <Toggle label="Escuadras de bandeja" checked={settings.shelfBrackets} onChange={(value) => onPatch({ shelfBrackets: value })} />
            <Toggle label="Topes de raíl" checked={settings.railEnds} onChange={(value) => onPatch({ railEnds: value })} />
            <Toggle label="Colgadores de pared" checked={settings.wallMounts} onChange={(value) => onPatch({ wallMounts: value })} />
          </Section>
          <Section title="Robustez" subtitle="Cargas y estabilidad" icon={<ShieldCheck size={15} />}>
            <NumberField label="Lastre estimado" value={Math.round(settings.width * settings.depth * 0.0007)} min={0} max={5000} step={10} unit="g" onChange={() => undefined} hint="Referencia para llenar el hueco" />
            <Toggle label="Apilable plegado" checked={settings.stackable} onChange={(value) => onPatch({ stackable: value })} />
          </Section>
        </>
      ) : (
        <>
          <Section title="Corte láser" subtitle="Espesor, kerf y encaje" icon={<Flame size={15} />} defaultOpen>
            <SelectField
              label="Material"
              value={settings.laserMaterial}
              options={LASER_MATERIALS.map((item) => ({ value: item.id, label: item.label }))}
              onChange={(value) => {
                const material = LASER_MATERIALS.find((item) => item.id === value);
                if (!material) return;
                onPatch({ laserMaterial: value, laserThickness: material.thickness, kerf: material.kerf });
              }}
            />
            <NumberField label="Espesor real" value={settings.laserThickness} min={1.5} max={12} step={0.1} onChange={(value) => onPatch({ laserThickness: value })} hint="Mídelo con calibre" />
            <NumberField label="Kerf" value={settings.kerf} min={0} max={0.8} step={0.01} onChange={(value) => onPatch({ kerf: value })} hint="Corta una galga" />
            <NumberField label="Ancho de dedo" value={settings.fingerWidth} min={3} max={30} step={1} onChange={(value) => onPatch({ fingerWidth: value })} />
            <NumberField label="Holgura de encaje" value={settings.fingerClearance} min={0} max={0.6} step={0.01} onChange={(value) => onPatch({ fingerClearance: value })} />
            <NumberField label="Dogbone" value={settings.dogbone} min={0} max={12} step={0.5} onChange={(value) => onPatch({ dogbone: value })} />
          </Section>
          <Section title="Hoja de corte" subtitle="Nesting y tamaño" icon={<Ruler size={15} />} defaultOpen>
            <SelectField
              label="Hoja"
              value={settings.sheet}
              options={SHEETS.map((sheet) => ({ value: sheet.id, label: sheet.label }))}
              onChange={(value) => {
                const sheet = SHEETS.find((item) => item.id === value);
                if (!sheet) return;
                onPatch({ sheet: value, sheetWidth: sheet.width, sheetHeight: sheet.height });
              }}
            />
            <NumberField label="Ancho de hoja" value={settings.sheetWidth} min={100} max={2000} step={5} onChange={(value) => onPatch({ sheetWidth: value })} />
            <NumberField label="Alto de hoja" value={settings.sheetHeight} min={100} max={2000} step={5} onChange={(value) => onPatch({ sheetHeight: value })} />
          </Section>
          <Section title="Bisagra viva" subtitle="Solo chapa fina de 3–4 mm" icon={<Scissors size={15} />}>
            <Toggle label="Incluir bisagra viva" checked={settings.livingHinge} onChange={(value) => onPatch({ livingHinge: value })} />
            <SelectField
              label="Modo de plegado láser"
              value={settings.laserFold}
              options={[
                { value: "flatpack", label: "Flat-pack desmontable" },
                { value: "livingHinge", label: "Bisagra viva" },
              ]}
              onChange={(value) => onPatch({ laserFold: value })}
            />
            <NumberField label="Filas" value={settings.hingeRows} min={2} max={20} step={1} unit="" onChange={(value) => onPatch({ hingeRows: value })} />
            <NumberField label="Longitud de ranura" value={settings.hingeSlot} min={6} max={40} step={0.5} onChange={(value) => onPatch({ hingeSlot: value })} />
            <NumberField label="Puente" value={settings.hingeBridge} min={0.8} max={8} step={0.1} onChange={(value) => onPatch({ hingeBridge: value })} />
            <NumberField label="Separación de filas" value={settings.hingeRowSpacing} min={1} max={10} step={0.1} onChange={(value) => onPatch({ hingeRowSpacing: value })} />
          </Section>
          <Section title="Kit impreso" subtitle="Complementos para el display láser" icon={<HardDrive size={15} />}>
            <Toggle label="Incluir kit de bisagras/ganchos" checked={settings.includePrintedKit} onChange={(value) => onPatch({ includePrintedKit: value })} />
            <p className="panel-note">Si activas el kit, el ZIP láser incluirá también las piezas 3D necesarias para bisagras, ganchos y topes.</p>
          </Section>
        </>
      )}
      <Section title="Estimación" subtitle="Filamento, tiempo y coste" icon={<CircleGauge size={15} />}>
        <p className="panel-note">La estimación se actualiza con la geometría. El laminador y la máquina tienen la última palabra.</p>
      </Section>
    </div>
  );
}
