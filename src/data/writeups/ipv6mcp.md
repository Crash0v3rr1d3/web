
toc	true
title	IPv6 MCP Spanish Countil
description	A tool set for IPv6 Spanish Users
pubDate	2026-04-20
titleImage	/public/image/hackmac2023/cover.webp
author	Crash0v3rr1d3


# Un kit de herramientas IPv6 para España: el MCP Server del Consejo IPv6 crece

Tool : https://github.com/Crash0verr1d3/IPv6Council-MCP

---

Cuando estaba a punto de publicar la primera versión del MCP Server del Consejo IPv6 España, el objetivo era sencillo: reducir la fricción operativa del día a día con IPv6. Validar una configuración de Nginx, calcular un plan de subnetting nibble-aligned, consultar qué prefijo delega Digi, tareas rutinarias que normalmente implican saltar entre documentación, hojas de cálculo y experiencia acumulada.

Pero me surgió la pregunta ¿y para Linux? ¿y para VyOS? ¿y si quiero saber si el usuario quiere saber si están listos para IPv6 como organización, no solo si esta interfaz está bien configurada?

Aqui respondemos a todo esto.

## Lo que había y lo que ha mejorado

El servidor original tenía cuatro herramientas: validación de configuraciones (Nginx, Cisco, Terraform), planificación nibble, consulta de ISPs y generación de RA para tres vendors. Sigue siendo la base — pero ahora es más ancha.

**Validación extendida a Linux, VyOS y Nokia SR OS.** La mayoría de la infraestructura IPv6 en España corre sobre Linux, y las configuraciones de Linux son donde hemos visto más errores silenciosos en producción. Un script de `ip6tables` con política DROP y sin ninguna regla ICMPv6 explícita no falla de forma visible — simplemente rompe NDP, PMTUD y DAD, y el equipo tarda días en diagnosticarlo. La herramienta `validate_ipv6_config` ahora detecta ese patrón, junto con `disable_ipv6=1` en sysctl, `accept_ra=0`, `ipv6.method: ignore` en NetworkManager, y la ausencia de `use_tempaddr=2` para privacidad en clientes SLAAC. También cubre VyOS (muy presente en redes comunitarias y despliegues open-source) y Nokia SR OS (infraestructura de operador).

**Generación de RA para VyOS y Nokia SR OS.** `generate_ra_config` ahora soporta cinco vendors. VyOS genera configuración en formato `set protocols router-advert`. Nokia SR OS genera el bloque `router-advertisements` en CLI clásica bajo la interfaz. Ambos siguen el mismo flujo obligatorio: genera, valida con `validate_ipv6_config`, entrega solo si el veredicto es PASS.

**Base de datos de ISPs ampliada a 19 entradas.** La versión anterior cubría diez operadores de red fija nacional. Ahora hay registros para los **cuatro operadores móviles principales** — y la diferencia importa: la MTU en red móvil es 1280, no hay DHCPv6-PD (solo /64 por dispositivo), y el comportamiento IPv6 de un operador fijo y su rama móvil puede ser muy diferente (Digi fija delega /48 sin CGN; Digi Móvil despliega IPv6 en 4G/5G, también sin CGN — pero sigue siendo un /64 por dispositivo). Se han añadido también ISPs regionales: Telecable, R Cable (ambos en el grupo MásMóvil), Finetwork, Aire Networks y Avatel. Cada entrada incluye ahora un campo `segment` (fixed/mobile/enterprise) y un análisis automático de brechas respecto al Plan Estratégico 2026.

## Las tres herramientas nuevas

### Planificación de sub-delegación DHCPv6-PD

`calculate_pd_plan` resuelve un problema concreto: tienes un prefijo delegado por tu ISP — un /56 de Movistar, un /60 de MásMóvil — y necesitas distribuirlo entre sedes, VLANs o routers downstream con nombres claros, reservas para infraestructura, y advertencias cuando el prefijo no es suficiente para lo que pides.

La herramienta recibe el prefijo delegado, la lista de sitios o VLANs que quieres asignar, y el tamaño objetivo por sitio. Devuelve las asignaciones etiquetadas, los cuatro subnets reservados por convención del Consejo (infraestructura, gestión OOB, DMZ, IoT), la zona `ip6.arpa` para delegación DNS inversa, y un aviso explícito si tu ISP te ha dado un /60 cuando necesitas espacio para más de 16 VLANs.

### Evaluación de madurez IPv6

`assess_ipv6_readiness` es la herramienta que más nos han pedido desde organizaciones que no saben por dónde empezar.

Recibe nueve inputs binarios sobre el estado actual de la organización — ¿tienes conectividad IPv6 del ISP? ¿tienes plan de direccionamiento? ¿tus servicios son dual-stack? ¿tienes política de firewall IPv6? ¿tienes formación? — más el tipo de organización, y devuelve una puntuación en cinco dimensiones (Conectividad, Servicios, Seguridad, Operaciones, Estrategia) y una etapa de madurez del 1 al 5, desde "solo IPv4" hasta "IPv6-Mostly listo".

Para organizaciones públicas (`public_admin`), la herramienta inyecta automáticamente las implicaciones ENS y Red SARA: qué servicios tienen obligación regulatoria de ser accesibles por IPv6, cómo coordinar la asignación de prefijos con RedIRIS, qué documentar en el CMDB. Una AAPP que no tiene AAAA records para sus servicios públicos no está en un estado "mejorable" — está incumpliendo el ENS. La herramienta lo dice con esa claridad.

### Generación de planes de migración

`generate_migration_plan` produce una hoja de ruta por fases hacia IPv6-Mostly, adaptada al tipo de organización y al estado de partida.

Cuatro estados de partida posibles: IPv4-only (cuatro fases, doce a dieciséis meses típicos), dual-stack parcial (tres fases), dual-stack completo (tres fases orientadas a la transición IPv6-Mostly), e IPv6-Mostly (una fase de descomisión IPv4). Si pasas el nombre de un ISP, la herramienta consulta `isp_capability_lookup` y añade contexto real al plan: qué prefijo puedes esperar, si hay problemas conocidos de MTU, qué implica la delegación en términos de capacidad de subnetting.

Para `public_admin` con `ens_compliance_required=True`, el plan incluye el checklist de auditoría ENS: registros AAAA, política IPv6 revisada por el responsable de seguridad, plan documentado en CMDB, monitorización cubriendo incidentes IPv6.

## La visión detrás del conjunto

Estas herramientas no son independientes — están diseñadas para usarse en secuencia. El flujo natural de una organización que empieza desde cero: evaluación de madurez → plan de migración → consulta del ISP → planificación de sub-delegación → generación de RA → validación. Cada herramienta alimenta a la siguiente, y el servidor MCP permite que ese flujo ocurra dentro de una sola conversación con el Consejero IPv6 España.

El objetivo no cambia: que desplegar IPv6 correctamente en España sea más fácil, más rápido y más seguro. Estas herramientas no sustituyen entender IPv6 — pero reducen la distancia entre saber y hacer.

El código, la base de datos de ISPs y la documentación están disponibles para la comunidad. Si hay datos incorrectos, ISPs que faltan, o casos de uso que el servidor no cubre bien, las contribuciones son bienvenidas en el repositorio del proyecto.


Crash0v3rr1d3 

Hacker at IPv6 Spanish Countil
