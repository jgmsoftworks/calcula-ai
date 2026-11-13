import { createContext, useContext } from 'react';

import { BUSINESS_REGIONS, type BusinessRegion } from '@/lib/business-region';

export const BusinessRegionContext = createContext<BusinessRegion>(BUSINESS_REGIONS.BR);
export const useBusinessRegion = () => useContext(BusinessRegionContext);
