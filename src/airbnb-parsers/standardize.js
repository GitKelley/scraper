/**
 * Standardize Airbnb listing data into a consistent format
 * Adapted from pyairbnb/standardize.py
 */

import { getNestedValue } from './utils.js';

/**
 * Standardize listing details from the embedded JSON data
 */
export function fromDetails(meta) {
  const ev = getNestedValue(meta, 'data.presentation.stayProductDetailPage.sections.metadata.loggingContext.eventDataLogging', {});
  
  const data = {
    coordinates: {
      latitude: getNestedValue(ev, 'listingLat', 0),
      longitude: getNestedValue(ev, 'listingLng', 0),
    },
    room_type: getNestedValue(ev, 'roomType', ''),
    is_super_host: getNestedValue(ev, 'isSuperhost', false),
    home_tier: getNestedValue(ev, 'homeTier', ''),
    person_capacity: getNestedValue(ev, 'personCapacity', 0),
    bedrooms: getNestedValue(ev, 'bedrooms', 0),
    bathrooms: getNestedValue(ev, 'bathrooms', 0),
    rating: {
      accuracy: getNestedValue(ev, 'accuracyRating', 0),
      checking: getNestedValue(ev, 'checkinRating', 0),
      cleanliness: getNestedValue(ev, 'cleanlinessRating', 0),
      communication: getNestedValue(ev, 'communicationRating', 0),
      location: getNestedValue(ev, 'locationRating', 0),
      value: getNestedValue(ev, 'valueRating', 0),
      guest_satisfaction: getNestedValue(ev, 'guestSatisfactionOverall', 0),
      review_count: getNestedValue(ev, 'visibleReviewCount', 0),
    },
    house_rules: {
      additional: '',
      general: [],
    },
    host: {
      id: '',
      name: '',
      joined_on: '',
      description: '',
    },
    sub_description: {
      title: '',
      items: [],
    },
    amenities: [],
    co_hosts: [],
    images: [],
    location_descriptions: [],
    highlights: [],
    title: '',
    description: '',
  };
  
  data.is_guest_favorite = false;
  
  // Check for guest favorite flag
  const sections = getNestedValue(meta, 'data.presentation.stayProductDetailPage.sections.sections', []);
  for (const section of sections) {
    if (section?.section?.isGuestFavorite !== undefined) {
      data.is_guest_favorite = section.section.isGuestFavorite;
    }
  }
  
  // Parse sbuiData sections
  const sd = getNestedValue(meta, 'data.presentation.stayProductDetailPage.sections.sbuiData', {});
  const sbuiSections = getNestedValue(sd, 'sectionConfiguration.root.sections', []);
  
  for (const section of sbuiSections) {
    const typeName = getNestedValue(section, 'sectionData.__typename', '');
    
    if (typeName === 'PdpHostOverviewDefaultSection') {
      data.host = {
        id: getNestedValue(section, 'sectionData.hostAvatar.loggingEventData.eventData.pdpContext.hostId', ''),
        name: getNestedValue(section, 'sectionData.title', ''),
      };
    } else if (typeName === 'PdpOverviewV2Section') {
      data.sub_description.title = getNestedValue(section, 'sectionData.title', '');
      const overviewItems = getNestedValue(section, 'sectionData.overviewItems', []);
      for (const item of overviewItems) {
        const itemTitle = getNestedValue(item, 'title', '');
        data.sub_description.items.push(itemTitle);
        
        // Try to extract bedrooms/bathrooms from overview items
        // Format: "4 bedrooms" or "3 bathrooms" or "3 baths"
        const bedroomMatch = itemTitle.match(/(\d+)\s+bedroom/i);
        if (bedroomMatch && !data.bedrooms) {
          data.bedrooms = parseInt(bedroomMatch[1]);
        }
        const bathroomMatch = itemTitle.match(/(\d+)\s+bath/i);
        if (bathroomMatch && !data.bathrooms) {
          data.bathrooms = parseInt(bathroomMatch[1]);
        }
      }
    }
  }
  
  // Also try to extract from the main sections (some listings have it in PdpTitleSection or other sections)
  // Check if we still don't have bedrooms/bathrooms, try parsing from description or other sources
  if (!data.bedrooms || !data.bathrooms) {
    // Try to get from eventDataLogging with different paths
    const bedroomsAlt = getNestedValue(ev, 'bedrooms', null) || 
                       getNestedValue(ev, 'bedroomCount', null) ||
                       getNestedValue(ev, 'numBedrooms', null);
    const bathroomsAlt = getNestedValue(ev, 'bathrooms', null) || 
                        getNestedValue(ev, 'bathroomCount', null) ||
                        getNestedValue(ev, 'numBathrooms', null);
    
    if (bedroomsAlt && !data.bedrooms) data.bedrooms = bedroomsAlt;
    if (bathroomsAlt && !data.bathrooms) data.bathrooms = bathroomsAlt;
  }
  
  // Parse main sections
  for (const section of sections) {
    const typeName = getNestedValue(section, 'section.__typename', '');
    const sectionData = section?.section || {};
    
    switch (typeName) {
      case 'HostProfileSection':
        data.host.id = getNestedValue(section, 'section.hostAvatar.userID', '');
        data.host.name = getNestedValue(section, 'section.title', '');
        data.host.joined_on = getNestedValue(section, 'section.subtitle', '');
        data.host.description = getNestedValue(section, 'section.hostProfileDescription.htmlText', '');
        
        const additionalHosts = getNestedValue(section, 'section.additionalHosts', []);
        for (const cohost of additionalHosts) {
          data.co_hosts.push({
            id: cohost.id || '',
            name: cohost.name || '',
          });
        }
        break;
        
      case 'PhotoTourModalSection':
        const mediaItems = getNestedValue(section, 'section.mediaItems', []);
        for (const mediaItem of mediaItems) {
          data.images.push({
            title: mediaItem.accessibilityLabel || '',
            url: mediaItem.baseUrl || '',
          });
        }
        break;
        
      case 'PoliciesSection':
        const houseRulesSections = getNestedValue(section, 'section.houseRulesSections', []);
        for (const houseRulesSection of houseRulesSections) {
          const houseRule = {
            title: houseRulesSection.title || '',
            values: [],
          };
          
          const items = houseRulesSection.items || [];
          for (const item of items) {
            if (item.title === 'Additional rules') {
              data.house_rules.additional = getNestedValue(item, 'html.htmlText', '');
              continue;
            }
            houseRule.values.push({
              title: item.title || '',
              icon: item.icon || '',
            });
          }
          
          data.house_rules.general.push(houseRule);
        }
        break;
        
      case 'LocationSection':
        const locationDetails = getNestedValue(section, 'section.seeAllLocationDetails', []);
        for (const locationDetail of locationDetails) {
          data.location_descriptions.push({
            title: locationDetail.title || '',
            content: getNestedValue(locationDetail, 'content.htmlText', ''),
          });
        }
        break;
        
      case 'PdpTitleSection':
        data.title = section.title || getNestedValue(section, 'section.title', '');
        
        // Sometimes bedrooms/bathrooms are in the title section metadata
        const titleSection = section?.section || {};
        if (!data.bedrooms) {
          data.bedrooms = getNestedValue(titleSection, 'bedrooms', null) ||
                         getNestedValue(titleSection, 'bedroomCount', null);
        }
        if (!data.bathrooms) {
          data.bathrooms = getNestedValue(titleSection, 'bathrooms', null) ||
                          getNestedValue(titleSection, 'bathroomCount', null);
        }
        break;
        
      case 'PdpHighlightsSection':
        const highlights = getNestedValue(section, 'section.highlights', []);
        for (const highlightingData of highlights) {
          data.highlights.push({
            title: highlightingData.title || '',
            subtitle: highlightingData.subtitle || '',
            icon: highlightingData.icon || '',
          });
        }
        break;
        
      case 'PdpDescriptionSection':
        data.description = getNestedValue(section, 'section.htmlDescription.htmlText', '');
        
        // Fallback: Try to parse bedrooms/bathrooms from description text
        // Format: "4 bedroom" or "3 bath" etc.
        if (data.description && (!data.bedrooms || !data.bathrooms)) {
          const descText = data.description.replace(/<[^>]*>/g, ' '); // Remove HTML tags
          if (!data.bedrooms) {
            const bedroomMatch = descText.match(/(\d+)\s+bedroom/i);
            if (bedroomMatch) {
              data.bedrooms = parseInt(bedroomMatch[1]);
            }
          }
          if (!data.bathrooms) {
            const bathroomMatch = descText.match(/(\d+)\s+bath/i);
            if (bathroomMatch) {
              data.bathrooms = parseInt(bathroomMatch[1]);
            }
          }
        }
        break;
        
      case 'AmenitiesSection':
        const amenityGroups = getNestedValue(section, 'section.seeAllAmenitiesGroups', []);
        for (const amenityGroupRaw of amenityGroups) {
          const amenityGroup = {
            title: amenityGroupRaw.title || '',
            values: [],
          };
          
          const amenities = amenityGroupRaw.amenities || [];
          for (const amenityRaw of amenities) {
            amenityGroup.values.push({
              title: amenityRaw.title || '',
              subtitle: amenityRaw.subtitle || '',
              icon: amenityRaw.icon || '',
              available: amenityRaw.available || '',
            });
          }
          
          data.amenities.push(amenityGroup);
        }
        break;
    }
  }
  
  return data;
}

