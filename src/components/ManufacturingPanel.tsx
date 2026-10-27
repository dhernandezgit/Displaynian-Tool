import { Flame, HardDrive, Layers, Printer, Ruler, Scissors, ShieldCheck } from "lucide-react";
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
            <NumberField label="Paredes" value={settings.walls} min={1} max={8} step={1} unit="" onChange={(value) => onPatch({ walls: value })} />
            <NumberField label="Relleno" value={settings.infill} min={0} max={60} step={1} unit="%" onChange={(value) => onPatch({ infill: value })} />
            <NumberField label="Holgura de encaje" value={settings.clearance} min={0.1} max={0.8} step={0.01} onChange={(value) => onPatch({ clearance: value })} hint="Pasador y bandeja" />
          </Section>
          <Section title="Encajes flat-pack" subtitle="Ranuras y tolerancias" icon={<Layers size={15} />} defaultOpen>
            <NumberField label="Holgura de ranura" value={settings.clearance} min={0.1} max={0.8} step={0.01} onChange={(value) => onPatch({ clearance: value })} />
            <p className="panel-note">Los laterales y las bandejas se imprimen planos. Comprueba una ranura con un trozo de bandeja antes de imprimir todo el set.</p>
          </Section>
          <Section title="Consejos de impresión" subtitle="Sin soportes y con paredes finas" icon={<ShieldCheck size={15} />}>
            <p className="panel-note">Bandejas de 2,4 mm, laterales de 4 mm y base de 3 mm. Todo se imprime plano, sin soportes. Usa PLA para interiores o PETG si vas a montar y desmontar muchas veces.</p>
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
            <Toggle label="Cupones de prueba" hint="Gancho SKÅDIS y galga de kerf" checked={settings.testCoupons} onChange={(value) => onPatch({ testCoupons: value })} />
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
            <Toggle label="Incluir kit de enlaces/ganchos" checked={settings.includePrintedKit} onChange={(value) => onPatch({ includePrintedKit: value })} />
            <p className="panel-note">Si activas el kit, el ZIP láser incluirá también laterales, bandejas y ganchos 3D.</p>
          </Section>
        </>
      )}
    </div>
  );
}
