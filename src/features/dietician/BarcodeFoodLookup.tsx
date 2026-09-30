import React, { useRef, useState } from 'react';
import { validProductBarcode, productPortion } from '../../../shared/food-product';
import { createMeal } from '../../services/MealCommandService';
import { getActiveProfileScope } from '../../services/profileScope';
import { emptyMealDetails, MealDetailsFields, mealDetailsEntry } from './MealDetailsFields';
import './DietEveryday.css';
export function BarcodeFoodLookup({
  date,
  onLogged,
}: {
  date: string;
  onLogged: () => Promise<void>;
}) {
  const [code, setCode] = useState(''),
    [product, setProduct] = useState<any>(null),
    [values, setValues] = useState<any>({}),
    [unit, setUnit] = useState('g'),
    [amount, setAmount] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const [details, setDetails] = useState(emptyMealDetails);
  const [mealType, setMealType] = useState('Other meals');
  const request = useRef(0);
  const lookup = async (barcode = code) => {
    if (!validProductBarcode(barcode)) {
      setMessage('Enter a valid EAN-8, UPC, EAN-13 or GTIN-14 barcode, including its check digit.');
      return;
    }
    const sequence = ++request.current,
      scope = getActiveProfileScope();
    setBusy(true);
    setProduct(null);
    setConfirmed(false);
    setMessage('');
    try {
      const response = await fetch(
        `${(import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '')}/api/food-product?code=${barcode}`,
        { signal: AbortSignal.timeout(12000) }
      );
      const data = await response.json();
      if (sequence !== request.current || scope !== getActiveProfileScope()) return;
      if (!response.ok || !data.product)
        throw new Error(
          response.status === 404
            ? 'Product not found. Use a label photo or save the food name instead.'
            : response.status === 429
              ? 'Please wait a minute before another lookup.'
              : 'Catalog unavailable. Use a label photo or save the food name.'
        );
      setProduct(data.product);
      setValues(
        Object.fromEntries(
          Object.entries(data.product.per100).map(([key, value]) => [
            key,
            value === null ? '' : String(value),
          ])
        )
      );
      setAmount('');
    } catch (error) {
      if (sequence === request.current && scope === getActiveProfileScope())
        setMessage(error instanceof Error ? error.message : 'Lookup failed.');
    } finally {
      if (sequence === request.current) setBusy(false);
    }
  };
  const detected = async (file: File | undefined) => {
    if (!file) return;
    try {
      const Detector = (window as any).BarcodeDetector;
      if (!Detector)
        throw new Error('Photo barcode detection is unavailable here. Type the printed barcode.');
      const bitmap = await createImageBitmap(file);
      try {
        const matches = await new Detector({ formats: ['ean_13', 'ean_8', 'upc_a'] }).detect(
          bitmap
        );
        const barcode = matches.find((item: any) => validProductBarcode(item.rawValue))?.rawValue;
        if (!barcode) throw new Error('No supported barcode found. Type the printed number.');
        setCode(barcode);
        await lookup(barcode);
      } finally {
        bitmap.close();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Detection failed. Type the barcode.');
    }
  };
  const log = async () => {
    if (busy || !product || !confirmed) return;
    setBusy(true);
    const scope = getActiveProfileScope();
    try {
      const per100 = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value === '' ? null : Number(value)])
      );
      if (
        Object.values(per100).some(
          (value) => value !== null && (!Number.isFinite(value) || value < 0)
        ) ||
        Number(per100.calories) > 1000 ||
        ['protein', 'carbs', 'fat', 'sugar', 'fibre'].some((key) => Number(per100[key]) > 100) ||
        Number(per100.sodium) > 100000
      )
        throw new Error('Check the values per 100. Leave unknown values blank.');
      const nutrients = productPortion(per100, Number(amount));
      if (scope !== getActiveProfileScope()) throw new Error('Profile changed. Reopen the lookup.');
      const result = await createMeal({
        localDate: date,
        captureMethod: 'clinical_lens',
        entry: {
          id: crypto.randomUUID(),
          name: product.name,
          type: mealType,
          ...nutrients,
          ...mealDetailsEntry(date, { ...details, amount, unit }),
          nutritionSource: 'food_catalog',
          foodType: 'packaged',
          sourceId: product.sourceId,
          sourceVersion: product.sourceVersion,
          originalNutritionBasis: unit === 'ml' ? 'per_100ml' : 'per_100g',
          per100Nutrients: per100,
          originalLabelNutrients: product.per100,
        },
      });
      if (!result.ok) throw new Error('Product meal was not saved. Try again.');
      await onLogged();
      setMessage(
        result.sync === 'queue_failed'
          ? 'Saved on this device; cloud sync needs attention.'
          : 'Product and consumed amount recorded. Catalog data remains unverified.'
      );
      setConfirmed(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save product meal.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="diet-everyday">
      <h4>Packaged food barcode</h4>
      <p>
        Look up a product, compare it with your package, then record the amount eaten. Missing
        products can still be logged by name or label photo.
      </p>
      <label>
        Printed barcode
        <input
          inputMode="numeric"
          maxLength={14}
          value={code}
          onChange={(e) => {
            request.current++;
            setBusy(false);
            setCode(e.target.value.replace(/\D/g, ''));
            setProduct(null);
            setConfirmed(false);
          }}
        />
      </label>
      <div className="diet-row">
        <button disabled={busy} onClick={() => lookup()}>
          Look up barcode
        </button>
        <label>
          Read barcode from a photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={(e) => detected(e.target.files?.[0])}
          />
        </label>
      </div>
      {product && (
        <article className="diet-tool-card">
          <h4>
            {product.name} · {product.brands}
          </h4>
          <p>
            <a href={product.sourceId} target="_blank" rel="noreferrer">
              Open Food Facts product record
            </a>{' '}
            ·{' '}
            <a
              href="https://opendatacommons.org/licenses/odbl/1-0/"
              target="_blank"
              rel="noreferrer"
            >
              ODbL
            </a>
            . Community data may be incomplete, outdated or a different formulation.
          </p>
          {product.issues.length > 0 && (
            <p role="alert">
              Catalog quality flags: compare every value with the printed label before using it.
            </p>
          )}
          <label>
            Printed label basis
            <select
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                setConfirmed(false);
              }}
            >
              <option value="g">Per 100 grams</option>
              <option value="ml">Per 100 milliliters</option>
            </select>
          </label>
          {product.basis === 'unknown' && (
            <p>
              The catalog does not establish the printed basis. Confirm it on your package; grams
              and milliliters are not interchangeable.
            </p>
          )}
          <div className="diet-form-grid">
            {Object.keys(values).map((key) => (
              <label key={key}>
                {key} per 100 {unit}
                {key === 'calories' ? ' (kcal)' : key === 'sodium' ? ' (mg)' : ' (g)'}
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={values[key]}
                  onChange={(e) => {
                    setValues({ ...values, [key]: e.target.value });
                    setConfirmed(false);
                  }}
                />
              </label>
            ))}
          </div>
          <p>
            Ingredients in catalog: {product.ingredients || 'Not recorded'}. Allergen information:{' '}
            {product.allergens || 'Unknown; absence of a catalog warning does not mean safe'}.
          </p>
          <label>
            Actual amount consumed ({unit})
            <input
              type="number"
              min="0.1"
              max="5000"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            Meal slot
            <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
              {['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Other meals'].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <MealDetailsFields
            includeAmount={false}
            date={date}
            value={details}
            onChange={setDetails}
          />
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{' '}
            I checked the product, values and per-100 basis against my package
          </label>
          <button
            disabled={busy || !confirmed || !(Number(amount) > 0)}
            className="primary"
            onClick={log}
          >
            Record consumed product
          </button>
        </article>
      )}
      <div role="status">{message}</div>
    </div>
  );
}
