import React, { useState, useEffect } from "react";
import { convertCurrency, getSupportedCurrencies, formatCurrency } from "../utils/multiCurrency";
import { getFromUserStorage, setInUserStorage } from "../utils/storageUtils";
import "../styles/CurrencyConverter.css";

interface CurrencyConverterProps {
  isProPlan?: boolean;
  onCurrencyChange?: (currency: string) => void;
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  isProPlan = false,
  onCurrencyChange,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [convertedPrices, setConvertedPrices] = useState<
    Array<{ name: string; originalPrice: number; convertedPrice: number }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isProPlan && selectedCurrency !== "USD") {
      convertPrices();
    }
  }, [selectedCurrency, isProPlan]);

  const convertPrices = async () => {
    try {
      setLoading(true);
      const productsData = getFromUserStorage<any[]>("shopifyProducts");

      if (!productsData || productsData.length === 0) {
        console.log("No products found to convert");
        setLoading(false);
        return;
      }

      const converted = productsData.map((product: any) => ({
        name: product.name,
        originalPrice: product.price,
        convertedPrice: convertCurrency(product.price, "USD", selectedCurrency),
      }));

      setConvertedPrices(converted);

      // Store the selected currency for the app
      setInUserStorage("selectedCurrency", selectedCurrency);
      onCurrencyChange?.(selectedCurrency);

      console.log(`✅ Multi-Currency: Converted prices to ${selectedCurrency}`);
    } catch (error) {
      console.error("❌ Currency conversion error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isProPlan) {
    return (
      <div className="currency-converter currency-locked">
        <div className="currency-header">
          <span className="currency-icon">💱</span>
          <h3>Multi-Currency Support</h3>
          <span className="pro-badge">Pro Only</span>
        </div>
        <p>Upgrade to Pro plan to use multi-currency pricing</p>
      </div>
    );
  }

  return (
    <div className="currency-converter">
      <div className="currency-header">
        <span className="currency-icon">💱</span>
        <h3>Multi-Currency Support</h3>
      </div>

      <div className="currency-selector-group">
        <label htmlFor="currency-select">Select Currency:</label>
        <select
          id="currency-select"
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          disabled={loading}
        >
          {getSupportedCurrencies().map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        {loading && <span className="loading-spinner">⟳</span>}
      </div>

      {selectedCurrency !== "USD" && convertedPrices.length > 0 && (
        <div className="conversion-preview">
          <h4>Price Conversions (USD → {selectedCurrency})</h4>
          <div className="conversion-table">
            {convertedPrices.slice(0, 5).map((item, index) => (
              <div key={index} className="conversion-row">
                <span className="product-name">{item.name}</span>
                <span className="original-price">${item.originalPrice.toFixed(2)}</span>
                <span className="arrow">→</span>
                <span className="converted-price">
                  {formatCurrency(item.convertedPrice, selectedCurrency)}
                </span>
              </div>
            ))}
            {convertedPrices.length > 5 && (
              <p className="more-items">+{convertedPrices.length - 5} more items</p>
            )}
          </div>
        </div>
      )}

      <div className="currency-info">
        <p>💡 Prices are automatically converted using live exchange rates</p>
      </div>
    </div>
  );
};

export default CurrencyConverter;
