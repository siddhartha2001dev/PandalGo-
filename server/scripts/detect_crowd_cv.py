#!/usr/bin/env python3
"""
PujoMap OpenCV Automated Crowd & Density Detection Engine
Processes queue and pandal photos to automatically detect people count,
spatial crowd density, wait time, and crowd level.
"""

import sys
import os
import json
import cv2
import numpy as np

def analyze_crowd_image(image_path):
    if not os.path.exists(image_path):
        return {
            "success": False,
            "error": f"Image file not found: {image_path}"
        }

    # Load image using OpenCV with cross-platform fallback for Windows paths
    img = cv2.imread(image_path)
    if img is None:
        try:
            raw_bytes = np.fromfile(image_path, dtype=np.uint8)
            img = cv2.imdecode(raw_bytes, cv2.IMREAD_COLOR)
        except Exception:
            img = None

    if img is None:
        return {
            "success": False,
            "error": f"Unable to decode image from path: {image_path}"
        }

    original_height, original_width = img.shape[:2]

    # Resize image for fast & normalized processing (max width 800px)
    max_dim = 800
    scale = 1.0
    if max(original_width, original_height) > max_dim:
        scale = max_dim / float(max(original_width, original_height))
        new_width = int(original_width * scale)
        new_height = int(original_height * scale)
        processed_img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)
    else:
        processed_img = img.copy()

    height, width = processed_img.shape[:2]
    gray = cv2.cvtColor(processed_img, cv2.COLOR_BGR2GRAY)

    # 1. Texture & Edge Gradient Density (Canny + Morphology)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 40, 140)

    # Focus especially on lower and central zones where queues and crowds form
    roi_mask = np.zeros_like(edges)
    roi_mask[int(height * 0.15):, :] = 255
    masked_edges = cv2.bitwise_and(edges, edges, mask=roi_mask)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    dilated_edges = cv2.dilate(masked_edges, kernel, iterations=2)

    total_roi_pixels = float((height * 0.85) * width)
    occupied_pixels = float(np.count_nonzero(dilated_edges))
    density_ratio = min(1.0, round(occupied_pixels / total_roi_pixels, 3))

    # 2. FAST Corner Clustering for Human Silhouettes and Bodies
    fast = cv2.FastFeatureDetector_create(threshold=25)
    keypoints = fast.detect(blurred, None)
    total_keypoints = len(keypoints)

    # 3. Head & Silhouette Contour Peak Clustering
    contours, _ = cv2.findContours(dilated_edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    head_candidate_count = 0
    contour_clusters = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 60 < area < 6000:
            x, y, w, h = cv2.boundingRect(cnt)
            aspect_ratio = float(h) / max(1, w)
            # Human upright heads / upper bodies typically have aspect ratio between 0.7 and 2.5
            if 0.6 <= aspect_ratio <= 3.0:
                head_candidate_count += 1
                contour_clusters.append({
                    "x": int(x / scale),
                    "y": int(y / scale),
                    "width": int(w / scale),
                    "height": int(h / scale),
                    "area": int(area / (scale * scale))
                })

    # 4. Synthesize Combined People Estimate
    # Weighted fusion of localized contours and high-density feature points
    estimated_people = int(head_candidate_count * 0.7 + (total_keypoints / 45.0) * 0.3)

    if density_ratio < 0.15:
        # Sparsely populated
        estimated_people = max(0, min(estimated_people, 15))
    elif density_ratio < 0.40:
        # Moderate flow
        estimated_people = max(12, min(estimated_people, 55))
    else:
        # High or dense crowd surge
        estimated_people = max(50, min(int(estimated_people * 1.3 + density_ratio * 70), 400))

    # 5. Classify Crowd Level and Derived Wait Times
    if density_ratio < 0.22 and estimated_people <= 15:
        crowd_level = "low"
        wait_minutes = max(3, int(estimated_people * 0.6))
        confidence = "high"
    elif density_ratio < 0.52 and estimated_people <= 50:
        crowd_level = "moderate"
        wait_minutes = max(15, int(estimated_people * 0.9))
        confidence = "high"
    else:
        crowd_level = "high"
        wait_minutes = max(35, int(estimated_people * 1.25))
        confidence = "high"

    # Zone distribution estimate (Entry, Queue, Core)
    top_third_density = np.count_nonzero(dilated_edges[:int(height * 0.4), :]) / max(1, (height * 0.4 * width))
    mid_third_density = np.count_nonzero(dilated_edges[int(height * 0.4):int(height * 0.7), :]) / max(1, (height * 0.3 * width))
    bot_third_density = np.count_nonzero(dilated_edges[int(height * 0.7):, :]) / max(1, (height * 0.3 * width))

    return {
        "success": True,
        "crowdLevel": crowd_level,
        "estimatedPeopleCount": estimated_people,
        "densityScore": density_ratio,
        "estimatedWaitMinutes": min(wait_minutes, 180),
        "confidence": confidence,
        "analysisEngine": "OpenCV 5.0 FAST & Morphological Contour Density",
        "detectedClusters": len(contour_clusters),
        "zones": {
            "entryZone": round(float(bot_third_density), 2),
            "queueCorridor": round(float(mid_third_density), 2),
            "sanctumCourtyard": round(float(top_third_density), 2)
        },
        "imageDimensions": {
            "width": original_width,
            "height": original_height
        }
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python detect_crowd_cv.py <image_path>"
        }))
        sys.exit(1)

    target_path = sys.argv[1]
    result = analyze_crowd_image(target_path)
    print(json.dumps(result))
