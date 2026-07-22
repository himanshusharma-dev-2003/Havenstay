import React, { useEffect, useRef, useState } from 'react';

const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  
  const [hoverType, setHoverType] = useState(null); 
  const [text, setText] = useState(''); 

  const mouse = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const requestRef = useRef(null);
  const hasMoved = useRef(false);

  useEffect(() => {
    // Check if the device is a touch device. If so, do not initialize custom cursor.
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isTouch) return;

    const onMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      if (!hasMoved.current) {
        hasMoved.current = true;
        ringPos.current.x = e.clientX;
        ringPos.current.y = e.clientY;
      }
      
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Magnetic effect for primary buttons
      const btns = document.querySelectorAll('.btn-primary');
      btns.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        // Define a hover radius of roughly 50px beyond the button's edges
        const radius = Math.max(rect.width, rect.height) / 2 + 50;
        
        if (distance < radius) {
          const shiftX = (distanceX / radius) * 10;
          const shiftY = (distanceY / radius) * 10;
          btn.style.transition = 'none';
          btn.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
        } else {
          if (btn.style.transform) {
            btn.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            btn.style.transform = '';
          }
        }
      });
    };

    const animateRing = () => {
      if (hasMoved.current && ringRef.current) {
        const ease = reducedMotion ? 1 : 0.18;
        
        ringPos.current.x += (mouse.current.x - ringPos.current.x) * ease;
        ringPos.current.y += (mouse.current.y - ringPos.current.y) * ease;
        
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }
      requestRef.current = requestAnimationFrame(animateRing);
    };

    const onMouseOver = (e) => {
      const target = e.target;
      // Elements that trigger interactive hover states
      if (target.closest('.btn-primary, .btn-outline, .btn-secondary, button')) {
        setHoverType('button');
        setText('');
      } else if (target.closest('img, .hotel-card, .hero-container')) {
        setHoverType('image');
        setText(target.closest('.hero-container') ? 'EXPLORE' : 'VIEW');
      } else if (target.closest('a, .nav-item, .clickable')) {
        setHoverType('link');
        setText('');
      } else {
        setHoverType(null);
        setText('');
      }
    };

    const onMouseOut = (e) => {
      const target = e.target;
      if (target.closest('.btn-primary, .btn-outline, .btn-secondary, button, img, .hotel-card, .hero-container, a, .nav-item, .clickable')) {
        setHoverType(null);
        setText('');
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    
    requestRef.current = requestAnimationFrame(animateRing);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Hide on touch devices entirely using CSS logic mapped to 'coarse' pointer, but we do it via state or just render
  const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (isTouch) return null;

  return (
    <div className={`custom-cursor-wrapper ${hoverType ? `hover-${hoverType}` : ''}`}>
      <div className="cursor-dot" ref={dotRef}></div>
      <div className="cursor-ring" ref={ringRef}>
        <span className="cursor-text">{text}</span>
      </div>
    </div>
  );
};

export default CustomCursor;
