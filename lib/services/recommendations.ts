import type { FMCSARecord } from '../types/fmcsa';
import type { EmailRecommendation } from '../types/email';
import type { ProcessedFilloutData } from '../types/fillout';

/**
 * Recommendation Service
 * Generates safety recommendations based on FMCSA data
 */

export interface RecommendationContext {
  fmcsaData: FMCSARecord;
  filloutData?: ProcessedFilloutData; // Additional context from Fillout form
  customPrompt?: string; // Optional custom prompt for AI generation
}

/**
 * Generates recommendations using OpenAI API
 */
export async function generateRecommendationsAI(
  context: RecommendationContext
): Promise<EmailRecommendation[]> {
  try {
    const response = await fetch('/api/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fmcsaData: context.fmcsaData,
        filloutData: context.filloutData,
        customPrompt: context.customPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate AI recommendations');
    }

    const data = await response.json();
    return data.recommendations || [];
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    // Fallback to rule-based recommendations
    return generateRecommendations(context);
  }
}

/**
 * Generates recommendations based on FMCSA data (rule-based)
 */
export function generateRecommendations(
  context: RecommendationContext
): EmailRecommendation[] {
  const recommendations: EmailRecommendation[] = [];
  const { fmcsaData, filloutData } = context;

  // Check MCS-150 form date (should be updated every 2 years)
  if (fmcsaData.mcs150FormDate) {
    const formDate = new Date(fmcsaData.mcs150FormDate);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    if (formDate < twoYearsAgo) {
      recommendations.push({
        category: 'Compliance',
        title: 'Update MCS-150 Form',
        description:
          'Your MCS-150 form is over 2 years old and should be updated to maintain compliance with FMCSA regulations.',
        priority: 'high',
      });
    }
  }

  // Check driver count
  if (fmcsaData.driverTotal !== undefined) {
    if (fmcsaData.driverTotal === 0) {
      recommendations.push({
        category: 'Operations',
        title: 'Driver Information Missing',
        description:
          'No driver information found. Ensure all active drivers are properly registered.',
        priority: 'high',
      });
    } else if (fmcsaData.driverTotal > 0 && fmcsaData.driverTotal < 5) {
      recommendations.push({
        category: 'Safety',
        title: 'Small Fleet Safety Program',
        description:
          'Consider implementing a comprehensive safety program tailored for small fleets to reduce risk and improve compliance.',
        priority: 'medium',
      });
    }
  }

  // Check vehicle count
  if (fmcsaData.vehicleTotal !== undefined) {
    if (fmcsaData.vehicleTotal === 0) {
      recommendations.push({
        category: 'Operations',
        title: 'Vehicle Information Missing',
        description:
          'No vehicle information found. Ensure all active vehicles are properly registered.',
        priority: 'high',
      });
    }
  }

  // Check cargo type for specific recommendations
  if (fmcsaData.cargoCarried) {
    const cargo = fmcsaData.cargoCarried.toLowerCase();
    
    if (cargo.includes('hazmat') || cargo.includes('hazardous')) {
      recommendations.push({
        category: 'Safety',
        title: 'Hazmat Compliance Review',
        description:
          'As a hazmat carrier, ensure all drivers have proper hazmat endorsements and vehicles meet hazmat requirements.',
        priority: 'high',
      });
    }

    if (cargo.includes('passenger')) {
      recommendations.push({
        category: 'Safety',
        title: 'Passenger Carrier Safety',
        description:
          'Passenger carriers should maintain enhanced safety protocols and regular vehicle inspections.',
        priority: 'high',
      });
    }
  }

  // Check carrier operation type
  if (fmcsaData.carrierOperation) {
    const operation = fmcsaData.carrierOperation.toLowerCase();
    
    if (operation.includes('interstate')) {
      recommendations.push({
        category: 'Compliance',
        title: 'Interstate Operations Compliance',
        description:
          'Interstate carriers must maintain compliance with federal regulations across all states of operation.',
        priority: 'medium',
      });
    }
  }

  // Check mileage
  if (fmcsaData.mcs150Mileage !== undefined) {
    if (fmcsaData.mcs150Mileage > 100000) {
      recommendations.push({
        category: 'Operations',
        title: 'High Mileage Operations',
        description:
          'High mileage operations require enhanced maintenance schedules and driver monitoring programs.',
        priority: 'medium',
      });
    }
  }

  // Check violations
  if (fmcsaData.violations && fmcsaData.violations.length > 0) {
    const recentViolations = fmcsaData.violations.filter(v => {
      if (!v.violationDate) return false;
      const violationDate = new Date(v.violationDate);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return violationDate >= sixMonthsAgo;
    });

    if (recentViolations.length > 0) {
      const highSeverityViolations = recentViolations.filter(v => 
        v.severity === 'high' || v.severity === 'critical'
      );
      
      if (highSeverityViolations.length > 0) {
        recommendations.push({
          category: 'Safety',
          title: 'Recent High-Severity Violations',
          description:
            `You have ${highSeverityViolations.length} high-severity violation(s) in the past 6 months. Immediate action is recommended to address these issues and prevent future violations.`,
          priority: 'high',
        });
      }

      // Group violations by BASIC category
      const violationsByBasic: Record<string, number> = {};
      recentViolations.forEach(v => {
        if (v.basic) {
          violationsByBasic[v.basic] = (violationsByBasic[v.basic] || 0) + (v.totalViolations || 1);
        }
      });

      // Add specific recommendations for common violation types
      // Handle both "HOS" and "Hours-of-Service Compliance" variations
      const hosViolations = violationsByBasic['HOS'] || violationsByBasic['Hours-of-Service Compliance'] || 0;
      if (hosViolations > 0) {
        recommendations.push({
          category: 'Compliance',
          title: 'Hours of Service Violations',
          description:
            `You have ${hosViolations} Hours of Service violation(s). Consider implementing an ELD system and driver training to ensure compliance.`,
          priority: 'high',
        });
      }

      if (violationsByBasic['Vehicle Maintenance']) {
        recommendations.push({
          category: 'Safety',
          title: 'Vehicle Maintenance Issues',
          description:
            `You have ${violationsByBasic['Vehicle Maintenance']} vehicle maintenance violation(s). Regular preventive maintenance schedules can help reduce these violations.`,
          priority: 'high',
        });
      }

      if (violationsByBasic['Driver Fitness']) {
        recommendations.push({
          category: 'Safety',
          title: 'Driver Fitness Concerns',
          description:
            `You have ${violationsByBasic['Driver Fitness']} driver fitness violation(s). Ensure all drivers have valid CDLs and medical certificates.`,
          priority: 'high',
        });
      }

      if (violationsByBasic['Controlled Substances']) {
        recommendations.push({
          category: 'Compliance',
          title: 'Controlled Substances Compliance',
          description:
            `You have ${violationsByBasic['Controlled Substances']} controlled substances violation(s). Ensure all drivers complete required drug and alcohol testing.`,
          priority: 'high',
        });
      }

      // Out-of-service violations
      const oosViolations = recentViolations.filter(v => 
        v.oosIndicator === 'Y' || v.oosIndicator === 'true' || String(v.oosIndicator) === 'true'
      );
      
      if (oosViolations.length > 0) {
        recommendations.push({
          category: 'Safety',
          title: 'Out-of-Service Violations',
          description:
            `You have ${oosViolations.length} out-of-service violation(s). These require immediate attention as they pose significant safety risks.`,
          priority: 'high',
        });
      }
    }

    // Overall violation trend
    if (fmcsaData.violations.length > 10) {
      recommendations.push({
        category: 'Safety',
        title: 'Comprehensive Safety Review Recommended',
        description:
          `You have ${fmcsaData.violations.length} total violation(s) on record. A comprehensive safety review and action plan is recommended to improve your safety rating.`,
        priority: 'medium',
      });
    }
  }

  // General welcome recommendation
  recommendations.push({
    category: 'Welcome',
    title: 'Welcome to Safety Management',
    description:
      'We\'re here to help you maintain compliance and improve your safety record. Our team can assist with DOT compliance, safety training, and risk management.',
    priority: 'low',
  });

  // Add Fillout-based recommendations if available
  if (filloutData?.operationalData) {
    const ops = filloutData.operationalData;

    // ELD system recommendations
    if (ops.eldSystem) {
      // Check if there are HOS violations
      const hosViolations = fmcsaData.violations?.filter(
        (v) => v.basic?.toLowerCase().includes('hos') || 
               v.basic?.toLowerCase().includes('hours-of-service')
      ) || [];
      
      if (hosViolations.length > 0) {
        recommendations.push({
          category: 'Compliance',
          title: 'Optimize ELD System Usage',
          description: `You're using ${ops.eldSystem} for ELD compliance. Consider reviewing ELD configuration and driver training to reduce your ${hosViolations.length} Hours of Service violation(s).`,
          priority: 'high',
        });
      }
    }

    // Dash camera recommendations
    if (ops.dashCameras && ops.dashCameras.toLowerCase() !== 'no' && ops.dashCameras.toLowerCase() !== 'none') {
      const unsafeDrivingViolations = fmcsaData.violations?.filter(
        (v) => v.basic?.toLowerCase().includes('unsafe driving')
      ) || [];
      
      if (unsafeDrivingViolations.length > 0) {
        recommendations.push({
          category: 'Safety',
          title: 'Leverage Dash Camera Data',
          description: `You have dash cameras installed (${ops.cameraSystem || 'system'}). Use camera footage to coach drivers and address your ${unsafeDrivingViolations.length} unsafe driving violation(s).`,
          priority: 'high',
        });
      }
    }

    // Training provider recommendations
    if (ops.trainingProvider) {
      const driverFitnessViolations = fmcsaData.violations?.filter(
        (v) => v.basic?.toLowerCase().includes('driver fitness')
      ) || [];
      
      if (driverFitnessViolations.length > 0) {
        recommendations.push({
          category: 'Safety',
          title: 'Enhance Training Program',
          description: `You work with ${ops.trainingProvider} for training. Consider adding focused training on driver fitness requirements to address your ${driverFitnessViolations.length} driver fitness violation(s).`,
          priority: 'medium',
        });
      }
    }

    // Maintenance recommendations
    if (ops.maintenanceShop && ops.maintenanceShop.toLowerCase().includes('yes')) {
      const maintenanceViolations = fmcsaData.violations?.filter(
        (v) => v.basic?.toLowerCase().includes('vehicle maintenance')
      ) || [];
      
      if (maintenanceViolations.length > 0 && ops.maintenanceProgram) {
        recommendations.push({
          category: 'Safety',
          title: 'Review Maintenance Program',
          description: `You have an in-house maintenance shop and ${ops.maintenanceProgram}. Review your preventive maintenance schedule to address your ${maintenanceViolations.length} vehicle maintenance violation(s).`,
          priority: 'high',
        });
      }
    }
  }

  return recommendations;
}

/**
 * Formats recommendations for email display
 */
export function formatRecommendationsForEmail(
  recommendations: EmailRecommendation[]
): string {
  const byPriority = {
    high: recommendations.filter((r) => r.priority === 'high'),
    medium: recommendations.filter((r) => r.priority === 'medium'),
    low: recommendations.filter((r) => r.priority === 'low'),
  };

  let html = '<div style="font-family: Arial, sans-serif; line-height: 1.6;">';
  
  if (byPriority.high.length > 0) {
    html += '<h3 style="color: #dc2626; margin-top: 20px;">High Priority Recommendations</h3>';
    html += '<ul>';
    byPriority.high.forEach((rec) => {
      html += `<li><strong>${rec.title}</strong>: ${rec.description}</li>`;
    });
    html += '</ul>';
  }

  if (byPriority.medium.length > 0) {
    html += '<h3 style="color: #f59e0b; margin-top: 20px;">Medium Priority Recommendations</h3>';
    html += '<ul>';
    byPriority.medium.forEach((rec) => {
      html += `<li><strong>${rec.title}</strong>: ${rec.description}</li>`;
    });
    html += '</ul>';
  }

  if (byPriority.low.length > 0) {
    html += '<h3 style="color: #10b981; margin-top: 20px;">Additional Recommendations</h3>';
    html += '<ul>';
    byPriority.low.forEach((rec) => {
      html += `<li><strong>${rec.title}</strong>: ${rec.description}</li>`;
    });
    html += '</ul>';
  }

  html += '</div>';
  return html;
}

