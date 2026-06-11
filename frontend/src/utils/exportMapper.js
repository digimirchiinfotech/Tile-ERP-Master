/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

/**
 * Utility for mapping data between different modules in the Export Management lifecycle.
 * Ensures consistent field naming and robust data inheritance.
 */

const getVal = (obj, ...args) => {
    if (args.length === 0) return undefined;
    const lastArg = args[args.length - 1];

    // If no object exists, the lastArg should only be returned if it's a real default value (like '', 0, or 'YES')
    // but not if it's likely a field name being used as a search key.
    if (!obj) {
        if (typeof lastArg === 'string' && (args.length > 1 || lastArg.includes('_'))) return '';
        return lastArg;
    }

    // 1. Try all arguments except the last one (as search keys)
    for (let i = 0; i < args.length - 1; i++) {
        const key = args[i];
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
            return obj[key];
        }
    }

    // 2. Check if the last argument is actually a key in the object
    if (obj[lastArg] !== undefined && obj[lastArg] !== null && obj[lastArg] !== '') {
        return obj[lastArg];
    }

    // 3. Fallback logic: Determine if lastArg is an intended literal default
    if (typeof lastArg === 'string') {
        // Suppress if lastArg looks like a DB field name or a key name used as a placeholder
        const isWhitelisted = ['container_no', 'weighbridge_name', 'manufacturer_name', 'manufacturer_address', 'backside_no', 'annexure_no', 'vgm_no', 'YES', 'NO', 'MADE IN INDIA'].includes(lastArg);
        const isRepeatedKey = args.length > 1 && args.slice(0, -1).includes(lastArg);
        const isLikelyKey = (lastArg.includes('_') || /^[a-z]+[A-Z]/.test(lastArg)) && lastArg.length > 2;

        if (!isWhitelisted && (isRepeatedKey || isLikelyKey)) {
            return '';
        }
    }

    return lastArg;
};

export const mergeUniqueFieldValues = (values, separator = ' | ') => {
    if (!Array.isArray(values)) return '';
    const uniqueVals = [];
    const trimmedSep = separator.trim();
    
    for (const val of values) {
        if (val === undefined || val === null) continue;
        
        const strVal = String(val).trim();
        if (!strVal || strVal === '-' || strVal.toUpperCase() === 'N/A') continue;
        
        // Split by newlines first
        const lines = strVal.split(/\r?\n/);
        for (const line of lines) {
            if (separator === '\n') {
                const trimmed = line.trim();
                if (trimmed && trimmed !== '-' && trimmed.toUpperCase() !== 'N/A' && !uniqueVals.includes(trimmed)) {
                    uniqueVals.push(trimmed);
                }
            } else {
                // Split by the separator string
                const parts = line.split(trimmedSep);
                for (const part of parts) {
                    const trimmed = part.trim();
                    if (trimmed && trimmed !== '-' && trimmed.toUpperCase() !== 'N/A' && !uniqueVals.includes(trimmed)) {
                        uniqueVals.push(trimmed);
                    }
                }
            }
        }
    }
    
    return uniqueVals.join(separator);
};

const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string' && date.includes(',')) {
        return date.split(',').map(d => formatDate(d.trim())).filter(Boolean).join(', ');
    }
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';
        return d.toLocaleDateString('en-CA');
    } catch (e) {
        return typeof date === 'string' ? date : '';
    }
};

const parseJSON = (str) => {
    if (!str) return [];
    if (Array.isArray(str)) return str;
    try {
        return JSON.parse(str);
    } catch (e) {
        return [];
    }
};

/**
 * Normalizes container details across different versions of objects
 */
const normalizeContainers = (input) => {
    let list = [];
    if (Array.isArray(input)) {
        list = input;
    } else if (typeof input === 'string') {
        list = parseJSON(input);
    } else if (input && typeof input === 'object') {
        const raw = getVal(input, 'containerSheet', 'container_sheet', 'containerDetails', 'container_details', 'backsideContainers', 'backside_containers', null);
        if (Array.isArray(raw)) list = raw;
        else if (typeof raw === 'string') list = parseJSON(raw);
        else list = [];
    }

    return list.map((c, i) => {
        const net = parseFloat(getVal(c, 'net_weight', 'netWeight', 'netWt', 'cargo_wt', 'cargoWt', 0)) || 0;
        const pal = parseInt(getVal(c, 'pallets', 'pallet_count', 'totalPallet', 'total_pallet', 0)) || 0;
        const gross = parseFloat(getVal(c, 'gross_weight', 'grossWeight', 'grossWt', 0));

        return {
            sr_no: i + 1,
            container_no: getVal(c, 'containerNo', 'container_no', 'container_number', 'containerNumber', 'cont_no', 'contNo', '') || '',
            line_seal_no: getVal(c, 'sealNo', 'seal_no', 'lineSealNo', 'line_seal_no', 'lineSeal', 'line_seal', 'seal', '') || '',
            e_seal_no: getVal(c, 'eSealNo', 'e_seal_no', 'eseal', 'esealNo', '') || '',
            vehicle_no: getVal(c, 'vehicle_no', 'vehicleNo', 'vehicle', '') || '',
            lr_no: getVal(c, 'lr_no', 'lrNo', 'lr', '') || '',
            type: getVal(c, 'container_size', 'containerSize', 'container_type', 'containerType', 'type', 'size', "20'"),
            product: getVal(c, 'product', 'product_name', 'productName', 'name', '') || '',
            material_description: getVal(c, 'material_description', 'materialDescription', 'description', 'product_description', 'productDescription', '') || '',
            pallet_detail: getVal(c, 'pallet_detail', 'palletDetail', 'pallet', '') || '',
            sqm_per_box: parseFloat(getVal(c, 'sqm_per_box', 'sqmPerBox', 'sqm_pb', 'sqm', 0)) || 0,
            total_sqm: parseFloat(getVal(c, 'total_sqm', 'totalSqm', 'sqmAuto', 'sqm_auto', 'sqm', 0)) || 0,
            boxes: parseInt(getVal(c, 'boxes', 'box', 'totalBoxes', 'total_boxes', 'pieces', 0)) || 0,


            box_weight: parseFloat(getVal(c, 'box_weight', 'boxWeight', 'box_wt', 0)) || 0,
            per_pallet_weight: parseFloat(getVal(c, 'per_pallet_weight', 'perPalletWeight', 20)) || 20,
            hsn_code: getVal(c, 'hsn_code', 'hsnCode', 'hs_code', 'hsCode', 'tariff_code', '') || '',
            pallets: pal,
            net_weight: net,
            // Right Formula: net_weight + (pallets * per_pallet_weight)
            gross_weight: !isNaN(gross) && gross > 0 ? gross : parseFloat((net + (pal * (parseFloat(getVal(c, 'per_pallet_weight', 'perPalletWeight', 20)) || 20))).toFixed(2)),
            cargo_wt: parseFloat(getVal(c, 'cargo_wt', 'cargoWt', 0)) || 0,
            tare_wt: parseFloat(getVal(c, 'tare_wt', 'tareWt', 0)) || 0,
            vgm_weight: parseFloat(getVal(c, 'vgm_weight', 'vgmWeight', 0)) || 0,
            slip_no: getVal(c, 'slip_no', 'slipNo', 'slip_number', '') || '',
            slip_no_date: getVal(c, 'slip_no_date', 'slipNoDate', '') || '',
            is_foc: !!(getVal(c, 'is_foc', 'isFoc', false)),
            detail: getVal(c, 'detail', 'details', '') || ''
        };
    });
};

const normalizeProductLines = (products) => {
    const list = parseJSON(products);
    return list.map(pl => {
        const totalBoxes = parseInt(getVal(pl, 'total_boxes', 'totalBoxes', 'boxes', 'pieces', 0)) || 0;
        const inheritedProductType = getVal(pl, 'product_type', 'productType', '');
        const isSanitaryware = inheritedProductType === 'sanitaryware' || 
                              (parseFloat(getVal(pl, 'sqm_per_box', 'sqmPerBox', 'sqm', 0)) === 0 && totalBoxes > 0);
        const productType = isSanitaryware ? 'sanitaryware' : 'tile';
        let boxWeight = parseFloat(getVal(pl, 'box_weight', 'boxWeight', 'per_box_weight', 'perBoxWeight', 'weightPerSqm', 'weight_per_sqm', 'net_weight_per_box', 0)) || 0;
        let sqmPerBox = isSanitaryware ? 0 : parseFloat(getVal(pl, 'sqm_per_box', 'sqmPerBox', 'sqm', 0)) || 0;
        const rate = parseFloat(getVal(pl, 'rate', 'unit_price', 0)) || 0;
        const isFoc = !!(getVal(pl, 'isFoc', 'is_foc', false));

        let sqmAuto = isSanitaryware ? 0 : parseFloat(getVal(pl, 'sqm_auto', 'sqmAuto', 'total_sqm', 'sqm', 0)) || 0;

        let netWeight = parseFloat(getVal(pl, 'net_weight', 'netWeight', 0)) || 0;
        if (!netWeight && boxWeight && totalBoxes) netWeight = parseFloat((boxWeight * totalBoxes).toFixed(2));

        // Auto-compute box weight if missing
        if ((!boxWeight || boxWeight === 0) && netWeight > 0 && totalBoxes > 0) {
            boxWeight = parseFloat((netWeight / totalBoxes).toFixed(4));
        }

        // Auto-compute sqm auto if missing
        if (!sqmAuto && totalBoxes && sqmPerBox && !isSanitaryware) sqmAuto = parseFloat((totalBoxes * sqmPerBox).toFixed(2));

        // Auto-compute sqm per box if missing
        if ((!sqmPerBox || sqmPerBox === 0) && sqmAuto > 0 && totalBoxes > 0 && !isSanitaryware) {
            sqmPerBox = parseFloat((sqmAuto / totalBoxes).toFixed(4));
        }

        const pal = parseInt(getVal(pl, 'total_pallet', 'pallets', 0)) || 0;
        const savedGross = parseFloat(getVal(pl, 'gross_weight', 'grossWeight', 0));
        const perPalletWeight = parseFloat(getVal(pl, 'per_pallet_weight', 'perPalletWeight', 20)) || 20;
        const grossWeight = !isNaN(savedGross) && savedGross > 0 ? savedGross : parseFloat((netWeight + (pal * perPalletWeight)).toFixed(2));

        const product = getVal(pl, 'product', 'product_name', 'name') || '';
        const size = getVal(pl, 'size', 'dimensions') || '';
        const surface = getVal(pl, 'surface', 'finish') || '';

        // Construct material_description if missing
        const materialDescription = getVal(pl, 'material_description', 'materialDescription', 'description', 'product_description', 'productDescription', '') ||
            `${product} ${size} ${surface}`.trim();

        return {
            product,
            size,
            surface,
            material_description: materialDescription,
            hsnCode: getVal(pl, 'hsnCode', 'hsn_code', 'hsCode', 'hs_code', 'tariff_code', '') || '',
            hsn_code: getVal(pl, 'hsnCode', 'hsn_code', 'hsCode', 'hs_code', 'tariff_code', '') || '',
            totalPallet: parseInt(getVal(pl, 'totalPallet', 'total_pallet', 'totalPallets', 'pallets', 0)) || 0,
            totalBoxes,
            boxWeight,
            sqm_per_box: sqmPerBox,
            sqm: sqmPerBox, // Important: mapped as sqm for PackingListForm
            sqmAuto,
            rate,
            amount: isFoc ? 0 : parseFloat((isSanitaryware ? (totalBoxes * rate) : (sqmAuto * rate)).toFixed(2)),
            netWeight,
            grossWeight,
            isFoc,
            is_foc: isFoc,
            product_type: productType,
            productType: productType,
            pieces: totalBoxes
        };
    });
};

export const exportMapper = {
    formatDate,
    /**
     * Maps Export Invoice data to Packing List initial state
     */
    mapInvoiceToPL: (inv) => {
        if (!inv) return {};
        const products = normalizeProductLines(getVal(inv, 'product_lines', 'productLines', 'products', 'items', []));

        const packingListNo = getVal(inv, 'packing_list_no', 'pl_no', 'packingListNo', 'plNo', '');
        return {
            id: packingListNo ? getVal(inv, 'id', null) : null,
            packing_list_no: packingListNo,
            proforma_invoice_no: getVal(inv, 'proforma_invoice_no', 'proformaInvoiceNo', 'piNo', 'pi_no', ''),
            proforma_invoice_id: getVal(inv, 'proforma_invoice_id', 'proformaInvoiceId', ''),
            proforma_invoice_date: formatDate(getVal(inv, 'proforma_invoice_date', 'proformaInvoiceDate', 'proforma_date', 'proformaDate', 'pi_date', 'piDate', '')),
            export_invoice_no: getVal(inv, 'invoice_no', 'invoiceNo', 'export_invoice_no', ''),
            export_invoice_id: getVal(inv, 'export_invoice_id', 'exportInvoiceId', 'id', ''),
            export_invoice_date: formatDate(getVal(inv, 'invoice_date', 'invoiceDate', 'export_invoice_date', 'exportInvoiceDate', 'date', '')),
            client_name: getVal(inv, 'client_name', 'clientName', ''),
            country: getVal(inv, 'country', ''),
            product_lines: products,
            consignee_details: getVal(inv, 'consignee_details', 'consigneeDetails', ''),
            buyer_details: getVal(inv, 'buyer_details', 'buyerDetails', ''),
            port_of_loading: getVal(inv, 'port_of_loading', 'portOfLoading', ''),
            port_of_discharge: getVal(inv, 'port_of_discharge', 'portOfDischarge', ''),
            final_destination: getVal(inv, 'final_destination', 'finalDestination', ''),
            payment_terms: getVal(inv, 'payment_terms', 'paymentTerms', ''),
            delivery_terms: getVal(inv, 'delivery_terms', 'deliveryTerms', ''),
            place_of_receipt: getVal(inv, 'place_of_receipt', 'placeOfReceipt', ''),
            vessel_name: getVal(inv, 'vessel_name', 'vesselName', 'vessel_flight_no', 'vesselFlightNo', ''),
            vessel_flight_no: getVal(inv, 'vessel_flight_no', 'vesselFlightNo', 'vessel_name', 'vesselName', ''),
            pre_carriage_by: getVal(inv, 'pre_carriage_by', 'preCarriageBy', ''),
            tariff_code: getVal(inv, 'tariff_code', 'tariffCode', ''),
            hs_code: getVal(inv, 'hs_code', 'hsCode', ''),
            product_description: getVal(inv, 'product_description', 'productDescription', 'material_header_description', 'GLAZED PORCELAIN TILES'),
            buyers_order_no: getVal(inv, 'buyers_order_no', 'buyersOrderNo', ''),
            buyers_order_date: formatDate(getVal(inv, 'buyers_order_date', 'buyersOrderDate', '')),
            pallet_type: getVal(inv, 'pallet_type', 'palletType', ''),
            tiles_back: getVal(inv, 'tiles_back', 'tilesBack', ''),
            boxes_marking: getVal(inv, 'boxes_marking', 'boxesMarking', ''),
            box_type: getVal(inv, 'box_type', 'boxType', ''),
            shipping_line_id: getVal(inv, 'shipping_line_id', 'shippingLineId', ''),
            fumigation: getVal(inv, 'fumigation', 'YES'),
            legalisation: getVal(inv, 'legalisation', 'NO'),
            made_in_india: getVal(inv, 'made_in_india', 'madeInIndia', 'YES'),
            country_of_origin: getVal(inv, 'country_of_origin', 'countryOfOrigin', 'INDIA'),
            lut_bond_ref: getVal(inv, 'lut_bond_ref', 'lutBondRef', 'lut_arn_no', 'lutArnNo', ''),
            lut_date: formatDate(getVal(inv, 'lut_date', 'lutDate', '')),

            currency: getVal(inv, 'currency', ''),
            iec_no: getVal(inv, 'iec_no', 'iecNo', 'iec', ''),
            total_pallets: parseInt(getVal(inv, 'total_pallets', 'totalPallets', 'pallets', 0)) || 0,
            total_boxes: parseInt(getVal(inv, 'total_boxes', 'totalBoxes', 0)) || 0,
            total_sqm: parseFloat(getVal(inv, 'total_sqm', 'totalSqm', 0)) || 0,
            net_weight: parseFloat(getVal(inv, 'net_weight', 'netWeight', 0)) || 0,
            gross_weight: parseFloat(getVal(inv, 'gross_weight', 'grossWeight', 0)) || 0,
            total_amount: parseFloat(getVal(inv, 'total_amount', 'totalAmount', 0)) || 0,
            status: getVal(inv, 'status', 'Pending'),
            container_details: normalizeContainers(getVal(inv, 'container_details', 'containerDetails', []))
        };
    },

    /**
     * Maps Packing List / Invoice data to Annexure initial state
     */
    mapPLToAnnexure: (pl, inv) => {
        const source = pl || inv || {};
        const products = normalizeProductLines(getVal(source, 'product_lines', 'productLines', []));
        let containers = normalizeContainers(source);

        // Detect if this is an existing Annexure or just inherited data
        const isExistingAnnexure = !!(getVal(source, 'annexure_no', 'annexureNo'));

        if (containers.length === 0 && products.length > 0) {
            // If fallbacking to product lines, default container size to 20' to avoid using product size (e.g. 600x600)
            containers = normalizeContainers(products).map(c => ({ ...c, type: "20'" }));
        }

        return {
            id: isExistingAnnexure ? getVal(source, 'id', null) : null,
            annexure_no: getVal(source, 'annexure_no', 'annexureNo') || '',
            packing_list_id: getVal(source, 'packing_list_id', 'pl_packing_list_id', 'packingListId', 'id') || '',
            export_invoice_id: getVal(source, 'export_invoice_id', 'exportInvoiceId') || '',
            shipping_line_id: getVal(source, 'shipping_line_id', 'shippingLineId', '') || '',
            // When editing, prioritize the saved Annexure "invoice_no" (which is actually the display no for the form)
            invoice_no: isExistingAnnexure ? getVal(source, 'invoice_no', 'invoiceNo') : getVal(source, 'export_invoice_no', 'exportInvoiceNo', 'invoice_no', 'invoiceNo', ''),
            export_invoice_no: getVal(source, 'export_invoice_no', 'exportInvoiceNo', 'invoice_no', 'invoiceNo', ''),
            invoice_date: formatDate(getVal(source, 'invoice_date', 'export_invoice_date', 'exportInvoiceDate', 'invoiceDate', 'date', '')),
            pi_no: getVal(source, 'pi_no', 'piNo', 'pi_reference', 'piReference', 'proforma_invoice_no', '') || '',
            pi_date: formatDate(getVal(source, 'pi_date', 'piDate', 'proforma_date', 'proformaDate', 'proforma_invoice_date', 'proformaInvoiceDate', 'pi_invoice_date', '')),
            export_invoice_date: formatDate(getVal(source, 'export_invoice_date', 'exportInvoiceDate', 'invoice_date', 'invoiceDate', 'inv_invoice_date', 'date', '')),
            pl_no: getVal(source, 'pl_no', 'plNo', 'packing_list_no', 'packingListNo', '') || '',
            booking_no: getVal(source, 'booking_no', 'bookingNo', 'inv_booking_no') || '',
            client_name: getVal(source, 'client_name', 'clientName') || '',
            consignee_details: getVal(source, 'consignee_details', 'consigneeDetails', 'consignee', 'inv_consignee_details', 'pl_consignee', '') || '',
            buyer_details: getVal(source, 'buyer_details', 'buyerDetails', 'buyer', 'inv_buyer_details', 'pl_buyer', '') || '',
            vessel_flight_no: getVal(source, 'vessel_flight_no', 'vesselFlightNo', 'vessel_name', 'vesselName') || '',
            port_of_loading: getVal(source, 'port_of_loading', 'portOfLoading') || '',
            port_of_discharge: getVal(source, 'port_of_discharge', 'portOfDischarge') || '',
            final_destination: getVal(source, 'final_destination', 'finalDestination') || '',
            country_of_origin: getVal(source, 'country_of_origin', 'countryOfOrigin', 'INDIA') || 'INDIA',
            country_of_final_destination: getVal(source, 'country_of_final_destination', 'final_destination', 'country', '') || '',
            material_header_description: getVal(source, 'material_header_description', 'materialDescription', 'product_description', 'productDescription', 'description', '') || '',
            total_pallets: getVal(source, 'total_pallets', 'totalPallets', 'pallets', 0) || 0,
            total_boxes: getVal(source, 'total_boxes', 'totalBoxes', 0) || 0,
            total_sqm: getVal(source, 'total_sqm', 'totalSqm', 0) || 0,
            net_weight: getVal(source, 'net_weight', 'netWeight', 0) || 0,
            gross_weight: getVal(source, 'gross_weight', 'grossWeight', 0) || 0,
            pallet_type: getVal(source, 'pallet_type', 'palletType') || '',
            made_in_india: getVal(source, 'made_in_india', 'madeInIndia', 'YES') || 'YES',
            tiles_back: getVal(source, 'tiles_back', 'tilesBack', 'MADE IN INDIA') || 'MADE IN INDIA',
            box_type: getVal(source, 'box_type', 'boxes_type', 'boxType') || '',
            fumigation: getVal(source, 'fumigation', 'YES') || 'YES',
            legalisation: getVal(source, 'legalisation', 'NO') || 'NO',

            total_packages: getVal(source, 'total_packages', 'total_boxes', 'totalBoxes', 0) || 0,
            marks_and_numbers: getVal(source, 'marks_and_numbers', 'boxes_marking', 'boxesMarking', 'boxMarking') || '',
            container_details: containers,
            product_lines: products,
            company_name: getVal(source, 'company_name', 'companyName', 'co_name') || source.company_info?.name || source.companyInfo?.name || '',
            company_address: getVal(source, 'company_address', 'companyAddress', 'co_address') || source.company_info?.address || source.companyInfo?.address || '',
            iec_no: getVal(source, 'iec_no', 'iecNo', 'company_iec', 'ei_iec', 'co_iec', '') || source.company_info?.iec_no || source.companyInfo?.iecNo || '',
            gstn: getVal(source, 'gstn', '') || source.company_info?.gstn || source.companyInfo?.gstn || '',
            pan: getVal(source, 'pan', '') || source.company_info?.pan || source.companyInfo?.pan || '',
            shipping_bill_no: getVal(source, 'shipping_bill_no', 'shippingBillNo', '') || '',
            shipping_bill_date: formatDate(getVal(source, 'shipping_bill_date', 'shippingBillDate', '')),
            c_no: getVal(source, 'c_no', 'cNo') || '',
            c_date: formatDate(getVal(source, 'c_date', 'cDate', '')),
            manufacturer_name: getVal(source, 'manufacturer_name', 'manufacturerName') || '',
            manufacturer_address: getVal(source, 'manufacturer_address', 'manufacturerAddress') || '',
            factory_address: getVal(source, 'factory_address', 'factoryAddress', 'AT MORBI') || 'AT MORBI',
            range_name: getVal(source, 'range_name', 'rangeName', ''),
            division: getVal(source, 'division', ''),
            commissionerate: getVal(source, 'commissionerate', ''),
            lut_arn_no: getVal(source, 'lut_arn_no', 'lutArnNo', 'lut_bond_ref', 'lutBondRef', ''),
            lut_date: formatDate(getVal(source, 'lut_date', 'lutDate', '')),
            examination_date: formatDate(getVal(source, 'examination_date', 'examinationDate', '')),
            examining_officer: getVal(source, 'examining_officer', 'examiningOfficer', ''),
            appraiser_name: getVal(source, 'appraiser_name', 'appraiserName', ''),
            permission_no: getVal(source, 'permission_no', 'permissionNo', ''),
            division_range: getVal(source, 'division_range', 'divisionRange', ''),
            samples_drawn: getVal(source, 'samples_drawn', 'samplesDrawn', ''),
            sample_seal_no: getVal(source, 'sample_seal_no', 'sampleSealNo', ''),
            declaration_text: getVal(source, 'declaration_text', 'declarationText', ''),
            customs_seal_no: getVal(source, 'customs_seal_no', 'customsSealNo', ''),
            status: getVal(source, 'status', 'Draft'),
            bank_details: getVal(source, 'bank_details', source.company_info?.bank_details || source.companyInfo?.bank_details || {
                bank_name: '',
                account_name: '',
                account_no: '',
                swift_code: '',
                bank_address: ''
            })
        };
    },

    /**
     * Maps Annexure to Backside
     */
    mapAnnexureToBackside: (ann) => {
        if (!ann) return {};

        const products = normalizeProductLines(getVal(ann, 'product_lines', 'productLines', []) || []);
        let containers = normalizeContainers(getVal(ann, 'container_details', 'containerDetails', []) || []);
        if (containers.length === 0 && products.length > 0) {
            containers = normalizeContainers(products);
        }

        let finalContainers;
        if (containers.length > 0) {
            // Group by Container No, Seal No, and E-Seal No
            const groups = {};
            containers.forEach(c => {
                const cNo = (c.container_no || '').trim() || 'UNKNOWN';
                const sNo = (c.sealNo || c.seal_no || c.line_seal_no || '').trim();
                const eNo = (c.e_seal_no || '').trim();
                const key = `${cNo}|${sNo}|${eNo}`;

                if (!groups[key]) {
                    groups[key] = { ...c };
                } else {
                    groups[key].total_sqm = parseFloat(((groups[key].total_sqm || 0) + (c.total_sqm || 0)).toFixed(2));
                    groups[key].boxes = (groups[key].boxes || 0) + (c.boxes || 0);
                    groups[key].pallets = (groups[key].pallets || 0) + (c.pallets || 0);
                    groups[key].net_weight = parseFloat(((groups[key].net_weight || 0) + (c.net_weight || 0)).toFixed(2));
                    groups[key].gross_weight = parseFloat(((groups[key].gross_weight || 0) + (c.gross_weight || 0)).toFixed(2));
                    if (!groups[key].material_description && c.material_description) {
                        groups[key].material_description = c.material_description;
                    }

                    // Handle Size/Type: Default to 20'
                    const s1 = (groups[key].size || groups[key].type || '').toString().toUpperCase();
                    const s2 = (c.size || c.type || '').toString().toUpperCase();
                    const isSize = (val) => val && (val.includes("'") || val.includes("FT") || val.includes("HC"));

                    if (!isSize(s1) && isSize(s2)) {
                        groups[key].size = s2;
                        groups[key].type = s2;
                    } else if (!isSize(groups[key].size)) {
                        groups[key].size = groups[key].size || "20'";
                        groups[key].type = groups[key].type || "20'";
                    }
                }
            });
            finalContainers = Object.values(groups).map((c, idx) => ({ ...c, sr_no: idx + 1 }));
        } else {
            finalContainers = [];
        }

        const isBackside = !!(getVal(ann, 'backside_no', 'backsideNo'));
        return {
            id: isBackside ? getVal(ann, 'id', null) : null,
            export_invoice_id: getVal(ann, 'export_invoice_id', 'exportInvoiceId', 'ei_id', null),
            annexure_id: getVal(ann, 'annexure_id', 'annexureId', 'id', null),
            invoice_date: formatDate(getVal(ann, 'invoice_date', 'invoiceDate', 'ei_invoice_date', 'export_invoice_date', 'exportInvoiceDate', 'date', 'document_date', '')),
            backside_no: getVal(ann, 'backside_no', 'backsideNo', '') || '',
            // Prioritize backside identity keys for existing records
            invoice_no: getVal(ann, 'backside_no', 'backsideNo', 'invoice_no', 'export_invoice_no', 'exportInvoiceNo', ''),
            pl_no: getVal(ann, 'pl_no', 'plNo', 'packing_list_no', '') || '',
            pi_no: getVal(ann, 'pi_no', 'piNo', 'pi_reference', '') || '',

            export_invoice_date: formatDate(getVal(ann, 'export_invoice_date', 'exportInvoiceDate', 'invoice_date', 'invoiceDate', 'date', '')),
            annexure_invoice_no: getVal(ann, 'annexure_no', 'annexureNo', 'annexure_invoice_no', '') || '',
            export_invoice_no: getVal(ann, 'ei_invoice_no', 'export_invoice_no', 'exportInvoiceNo', 'invoice_no', '') || '',
            shipping_line_id: getVal(ann, 'shipping_line_id', 'shippingLineId', '') || '',
            booking_no: getVal(ann, 'booking_no', 'bookingNo', 'inv_booking_no', '') || '',
            client_name: getVal(ann, 'client_name', 'clientName', '') || '',
            consignee_details: getVal(ann, 'consignee_details', 'consigneeDetails', 'inv_consignee_details', '') || '',
            buyer_details: getVal(ann, 'buyer_details', 'buyerDetails', 'inv_buyer_details', '') || '',
            vessel_name: getVal(ann, 'vessel_flight_no', 'vesselFlightNo', 'vessel_name', 'vesselName', '') || '',
            port_of_loading: getVal(ann, 'port_of_loading', 'portOfLoading') || '',
            port_of_discharge: getVal(ann, 'port_of_discharge', 'portOfDischarge') || '',
            final_destination: getVal(ann, 'final_destination', 'finalDestination') || '',
            total_packages: parseInt(getVal(ann, 'total_packages', 'totalPackages', 'total_boxes', 0)) || 0,
            total_boxes: parseInt(getVal(ann, 'total_boxes', 'totalBoxes', 0)) || 0,
            total_pallets: parseInt(getVal(ann, 'total_pallets', 'totalPallets', 'pallets')) || 0,
            total_sqm: parseFloat(getVal(ann, 'total_sqm', 'totalSqm', 0)) || 0,
            net_weight: parseFloat(getVal(ann, 'net_weight', 'netWeight', 0)) || 0,
            gross_weight: parseFloat(getVal(ann, 'gross_weight', 'grossWeight', 0)) || 0,

            branch_code_no: getVal(ann, 'branch_code_no', 'branchCodeNo', '') || '',
            bin_no: getVal(ann, 'bin_no', 'binNo', '') || '',
            goods_description_match: getVal(ann, 'goods_description_match', 'goodsDescriptionMatch', '') || 'YES',
            samples_drawn: getVal(ann, 'samples_drawn', 'samplesDrawn', '') || '',
            sample_seal_no: getVal(ann, 'sample_seal_no', 'sampleSealNo', '') || '',
            customs_seal_no: getVal(ann, 'customs_seal_no', 'customsSealNo', '') || '',
            permission_no: getVal(ann, 'permission_no', 'permissionNo', '') || '',
            lut_arn_no: getVal(ann, 'lut_arn_no', 'lutArnNo', 'inv_lut_bond_ref', '') || '',
            lut_date: formatDate(getVal(ann, 'lut_date', 'lutDate', 'pi_lut_date', '')),
            division_range: getVal(ann, 'division_range', 'divisionRange', '') || '',
            declaration_text: getVal(ann, 'declaration_text', 'declarationText', '') || 'EXAMINED THE EXPORT GOODS COVERED UNDER THIS INVOICE ,DESCRIPTION OF THE GOODS WITH REFERENCE TO DUTY DRAWBACK SCHEDULE .\nWEIGHT ARE AS UNDER',

            container_details: finalContainers,
            range_name: getVal(ann, 'range_name', 'rangeName', '') || '',
            division: getVal(ann, 'division', '') || '',
            commissionerate: getVal(ann, 'commissionerate', '') || '',
            factory_address: getVal(ann, 'factory_address', 'factoryAddress', '') || '',
            iec_no: getVal(ann, 'iec_no', 'iecNo', 'company_iec', '') || '',
            company_name: getVal(ann, 'company_name', 'companyName', '') || '',
            company_address: getVal(ann, 'company_address', 'companyAddress', '') || '',
            manufacturer_name: getVal(ann, 'manufacturer_name', 'manufacturerName', 'inv_manufacturer_name', '') || '',
            manufacturer_address: getVal(ann, 'manufacturer_address', 'manufacturerAddress', 'inv_manufacturer_address', '') || '',
            shipping_bill_no: getVal(ann, 'shipping_bill_no', 'shippingBillNo', '') || '',
            shipping_bill_date: formatDate(getVal(ann, 'shipping_bill_date', 'shippingBillDate', '')),
            country_of_origin: getVal(ann, 'country_of_origin', 'countryOfOrigin', '') || '',
            examination_date: formatDate(getVal(ann, 'examination_date', 'examinationDate', '')),
            examining_officer: getVal(ann, 'examining_officer', 'examiningOfficer', '') || '',
            appraiser_name: getVal(ann, 'appraiser_name', 'appraiserName', '') || '',
            c_no: getVal(ann, 'c_no', 'cNo', '') || '',
            c_date: formatDate(getVal(ann, 'c_date', 'cDate', '')),
            goods_description: getVal(ann, 'material_header_description', 'materialDescription', 'product_description', 'productDescription', '') || '',
            status: getVal(ann, 'status', 'Draft')
        };
    },

    /**
     * Maps Backside to VGM
     */
    mapBacksideToVGM: (bs) => {
        if (!bs) return {};

        // Detect if this is an existing VGM or just inherited data
        const isExistingVGM = !!(getVal(bs, 'vgm_no', 'vgmNo') && !getVal(bs, 'suggested_vgm_no', 'suggestedVgmNo'));

        const rawContainers = normalizeContainers(bs);

        // Group containers by container_no so multiple products in the same
        // physical container are aggregated into a single VGM row.
        const groupContainersForVGM = (list) => {
            if (!list || list.length === 0) return [];
            const groups = {};
            list.forEach(c => {
                const cNo = (c.container_no || c.containerNo || c.container_number || c.cont_no || c.contNo || '').trim();
                if (!cNo || cNo === '') return;
                if (!groups[cNo]) {
                    groups[cNo] = { ...c };
                } else {
                    groups[cNo].total_sqm = parseFloat(((groups[cNo].total_sqm || 0) + (c.total_sqm || 0)).toFixed(2));
                    groups[cNo].boxes = (groups[cNo].boxes || 0) + (c.boxes || 0);
                    groups[cNo].pallets = (groups[cNo].pallets || 0) + (c.pallets || 0);
                    groups[cNo].net_weight = parseFloat(((groups[cNo].net_weight || 0) + (c.net_weight || 0)).toFixed(2));
                    groups[cNo].gross_weight = parseFloat(((groups[cNo].gross_weight || 0) + (c.gross_weight || 0)).toFixed(2));
                    groups[cNo].cargo_wt = parseFloat(((groups[cNo].cargo_wt || 0) + (c.cargo_wt || 0)).toFixed(2));
                    if (!groups[cNo].material_description && c.material_description) {
                        groups[cNo].material_description = c.material_description;
                    }
                    if (c.lr_no && !groups[cNo].lr_no) groups[cNo].lr_no = c.lr_no;
                    if (c.vehicle_no && !groups[cNo].vehicle_no) groups[cNo].vehicle_no = c.vehicle_no;
                }
            });
            return Object.values(groups).map((c, idx) => ({ ...c, sr_no: idx + 1 }));
        };

        const containers = groupContainersForVGM(rawContainers);

        const isVGM = !!(getVal(bs, 'vgm_no', 'vgmNo'));
        return {
            id: isVGM ? getVal(bs, 'id', null) : null,
            export_invoice_id: getVal(bs, 'export_invoice_id', 'exportInvoiceId', ''),
            vgm_no: getVal(bs, 'vgm_no', 'vgmNo', 'suggested_vgm_no', 'suggestedVgmNo', ''),
            vgm_date: formatDate(getVal(bs, 'vgm_date', 'vgmDate', new Date())),
            export_invoice_no: getVal(bs, 'export_invoice_no', 'exportInvoiceNo', ''),
            export_invoice_date: formatDate(getVal(bs, 'export_invoice_date', 'exportInvoiceDate', 'invoice_date', 'invoiceDate', 'date', '')),
            invoice_date: formatDate(getVal(bs, 'invoice_date', 'invoiceDate', 'export_invoice_date', 'exportInvoiceDate', 'date', '')),
            pi_date: formatDate(getVal(bs, 'pi_date', 'piDate', 'proforma_invoice_date', 'proformaInvoiceDate', 'pi_invoice_date', '')),
            pi_no: getVal(bs, 'pi_no', 'piNo', ''),
            pl_no: getVal(bs, 'pl_no', 'plNo', ''),
            annexure_no: getVal(bs, 'annexure_no', 'annexureNo', 'annexure_invoice_no', 'annexureInvoiceNo', ''),
            shipper_name: getVal(bs, 'shipper_name', 'shipperName', 'company_name', 'companyName', ''),
            shipper_iec: getVal(bs, 'shipper_iec', 'shipperIec', 'iec_no', 'iecNo', ''),
            authorized_person: getVal(bs, 'authorized_person', 'authorizedPerson', 'comp_authorized_person', 'examining_officer', 'examiningOfficer', ''),
            booking_number: getVal(bs, 'booking_number', 'booking_no', 'bookingNo', 'backside_booking_no', 'ei_booking_no', ''),
            vessel_name: getVal(bs, 'vessel_name', 'vesselName', 'vessel_flight_no', 'vesselFlightNo', ''),
            voyage_no: getVal(bs, 'voyage_no', 'voyageNo', ''),
            port_of_loading: getVal(bs, 'port_of_loading', 'portOfLoading', ''),
            contact_details: getVal(bs, 'contact_details', 'contactDetails', 'comp_contact', ''),
            client_name: getVal(bs, 'client_name', 'clientName', ''),
            weighbridge_name: getVal(bs, 'weighbridge_name', 'weighbridgeName', 'backside_weighbridge', '') || 
                (getVal(bs, 'manufacturer_name', 'manufacturerName', '') ?
                `${getVal(bs, 'manufacturer_name', 'manufacturerName', '')}\n${getVal(bs, 'manufacturer_address', 'manufacturerAddress', '')}` : ''),
            max_permissible_weight: getVal(bs, 'max_permissible_weight', 'maxPermissibleWeight', 'backside_max_weight', 0),
            backside_no: getVal(bs, 'backside_no', 'backsideNo', ''),
            weighing_method: getVal(bs, 'weighing_method', 'METHOD-1'),
            cargo_type: getVal(bs, 'cargo_type', 'NORMAL'),
            un_no_imdg: getVal(bs, 'un_no_imdg', 'NA'),
            box_type: getVal(bs, 'box_type', 'boxes_type', 'boxType', 'backside_box_type', ''),
            pallet_type: getVal(bs, 'pallet_type', 'pallets_type', 'palletType', 'backside_pallet_type', ''),
            weighing_slip_no: getVal(bs, 'weighing_slip_no', 'AS PER BELOW DETAILS'),
            weighing_date: getVal(bs, 'weighing_date', 'AS PER BELOW DETAILS'),
            country_of_origin: getVal(bs, 'country_of_origin', 'countryOfOrigin', '') || '',
            container_no: getVal(bs, 'container_no', 'containerNo', '') || 'AS PER ATTACHMENT',
            container_size: getVal(bs, 'container_size', 'containerSize', 'TEU'),
            product_description: getVal(bs, 'product_description', 'productDescription', 'goods_description', 'goodsDescription', 'description_of_goods', 'descriptionOfGoods', 'anx_goods_description', 'anxGoodsDescription', 'GLAZED PORCELAIN TILES'),
            status: getVal(bs, 'status', 'Draft'),
            container_sheet: containers.map(c => {
                const cargo = parseFloat(c.cargo_wt || c.cargo_weight || c.gross_weight || c.net_weight || 0);
                const tare = parseFloat(c.tare_wt || c.tare_weight || 0);
                const vgmWeight = parseFloat(getVal(c, 'vgm_weight', 'vgmWeight', 0)) || (cargo + tare);
                
                return {
                    ...c,
                    container_no: getVal(c, 'container_no', 'containerNo', 'cont_no', ''),
                    type: c.container_size || c.type || c.containerSize || "20'",
                    cargo_wt: cargo,
                    tare_wt: tare,
                    vgm_weight: parseFloat(vgmWeight.toFixed(2)),
                    weighing_slip_no: getVal(c, 'weighing_slip_no', 'slip_no', 'slipNo', ''),
                    weighing_date: formatDate(getVal(c, 'weighing_date', 'slip_no_date', 'slipNoDate', null))
                };
            })
        };
    },

    /**
     * Maps VGM/Backside/Annexure/Invoice to Shipping Instruction
     */
    mapVGMToSI: (vgm, bs, ann, inv) => {
        const source = vgm || bs || ann || inv || {};
        const containers = normalizeContainers(getVal(source, 'containerSheet', 'container_sheet', 'containerDetails', 'container_details', []));

        const isSI = !!(getVal(source, 'instructionNo', 'si_no', 'instruction_no'));
        const totalGrossWeight = parseFloat(getVal(source, 'totalGrossWeight', 'total_gross_weight', 'gross_weight', 'totalVgmWeight', 'total_vgm_weight', 0));
        
        return {
            id: isSI ? getVal(source, 'id', null) : null,
            instructionNo: getVal(source, 'instructionNo', 'si_no', ''),
            date: formatDate(getVal(source, 'date', 'si_date', '')),
            bookingNo: getVal(source, 'bookingNo', 'booking_no', 'booking_number', ''),
            vgmNo: getVal(source, 'vgmNo', 'vgm_no', ''),
            piNo: getVal(source, 'piNo', 'pi_no', 'piReference', 'proformaInvoiceNo', ''),
            exportInvoiceNo: getVal(source, 'exportInvoiceNo', 'export_invoice_no', 'invoiceNo', 'invoice_no', ''),
            invoiceReference: getVal(source, 'exportInvoiceNo', 'export_invoice_no', 'invoiceNo', ''),
            plNo: getVal(source, 'plNo', 'pl_no', 'packingListNo', ''),
            piDate: formatDate(getVal(source, 'piDate', 'pi_date', 'proforma_invoice_date', 'proformaInvoiceDate', 'pi_invoice_date', '')),
            exportInvoiceDate: formatDate(getVal(source, 'exportInvoiceDate', 'export_invoice_date', 'invoice_date', 'invoiceDate', 'date', '')),
            annexureNo: getVal(source, 'annexureNo', 'annexure_no', 'annexureInvoiceNo', ''),
            backsideNo: getVal(source, 'backsideNo', 'backside_no', ''),
            exporterDetails: getVal(source, 'backsideShipperDetails', 'backside_shipper_details', 'shipperDetails', 'shipper_details', 'exporterDetails', 'exporter_details', '') ||
                (getVal(source, 'company_name', 'companyName') ? `${getVal(source, 'company_name', 'companyName')}\n${getVal(source, 'company_address', 'companyAddress')}` : ''),
            consigneeDetails: getVal(source, 'consigneeDetails', 'consignee_details', 'pi_consignee_details', 'pi_consignee', 'consignee_details_pi', 'buyer_details', 'buyerDetails', 'consignee_name', ''),
            notifyParty1: getVal(source, 'notifyPartyDetails', 'notify_party_details', 'notifyParty1', 'notify_party_1', 'pi_notify_party', 'pi_notify_details', ''),
            notifyParty2: getVal(source, 'notifyParty2', 'notify_party_2_details', 'notify_party_2', 'pi_notify_party_2', ''),
            pol: getVal(source, 'pol', 'portOfLoading', 'port_of_loading', ''),
            pod: getVal(source, 'pod', 'portOfDischarge', 'port_of_discharge', ''),
            finalDestination: getVal(source, 'finalDestination', 'final_destination', ''),
            vesselName: getVal(source, 'vesselName', 'vessel_name', 'vesselFlightNo', 'vessel_flight_no', ''),
            voyageNo: getVal(source, 'voyageNo', 'voyage_no', ''),
            etd: formatDate(getVal(source, 'etd', '')),
            blType: getVal(source, 'blType', 'bl_type', ''),
            bietcNumber: getVal(source, 'bietcNumber', 'bietc_number', ''),
            freightPayableAt: getVal(source, 'freightPayableAt', 'freight_payable_at', ''),
            hsCode: getVal(source, 'hsCode', 'hs_code', ''),
            sbNo: getVal(source, 'sbNo', 'sb_no', 'shipping_bill_no', ''),
            sbDate: formatDate(getVal(source, 'sbDate', 'sb_date', 'shipping_bill_date', null)),
            totalNetWeight: parseFloat(getVal(source, 'netWeight', 'net_weight', 0)) || containers.reduce((sum, c) => sum + parseFloat(c.netWeight || c.net_weight || c.cargoWt || c.cargo_wt || c.netWt || 0), 0),
            totalGrossWeight: totalGrossWeight || containers.reduce((sum, c) => sum + parseFloat(c.grossWeight || c.gross_weight || c.grossWt || c.cargoWt || c.cargo_wt || c.vgmWeight || c.vgm_weight || 0), 0),
            totalSqm: parseFloat(getVal(source, 'totalSqm', 'total_sqm', 0)) || containers.reduce((sum, c) => sum + parseFloat(c.totalSqm || c.total_sqm || c.sqm || 0), 0),
            totalBoxes: parseInt(getVal(source, 'totalBoxes', 'total_boxes', 'totalPackages', 'total_packages', 0)) || containers.reduce((sum, c) => sum + parseInt(c.totalBoxes || c.boxes || 0), 0),
            totalPallets: parseInt(getVal(source, 'totalPallets', 'total_pallets', 0)),
            country_of_origin: getVal(source, 'country_of_origin', 'countryOfOrigin', '') || '',
            freightForwarder: getVal(source, 'freightForwarder', 'freight_forwarder', ''),
            siDescription: getVal(source, 'siDescription', 'description_of_goods', 'descriptionOfGoods', 'goods_description', 'material_header_description', ''),
            status: getVal(source, 'status', 'Draft'),
            containerDetails: containers.map((c, idx) => {
                const seal = c.sealNo || c.seal_no || c.lineSealNo || c.line_seal_no || '';
                const sqmVal = parseFloat(c.totalSqm || c.total_sqm || c.sqm || 0);
                const boxesVal = parseInt(c.totalBoxes || c.boxes || 0);
                
                let gw = parseFloat(c.grossWeight || c.gross_weight || c.grossWt || c.cargoWt || c.cargo_wt || c.vgmWeight || c.vgm_weight || 0);
                // Auto-heal logic: If there is exactly 1 container, its gross weight MUST be the document's total gross weight.
                // This instantly fixes older saved documents where VGM weight was incorrectly written to grossWt.
                if (containers.length === 1 && totalGrossWeight > 0) {
                    gw = totalGrossWeight;
                }

                return {
                    srNo: c.srNo || c.sr_no || idx + 1,
                    containerNo: c.containerNo || c.container_no || '',
                    sealNo: seal,
                    sqm: sqmVal,
                    boxes: boxesVal,
                    netWt: parseFloat(c.netWeight || c.net_weight || c.cargoWt || c.cargo_wt || c.netWt || 0),
                    grossWt: gw,
                    materialDescription: c.materialDescription || c.material_description || '',
                    isFoc: !!(c.isFoc || c.is_foc)
                };
            })
        };
    },
};
